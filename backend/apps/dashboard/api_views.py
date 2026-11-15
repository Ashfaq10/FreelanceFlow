from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from drf_spectacular.utils import extend_schema
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.models import Client
from apps.invoices.models import Invoice, to_cents
from apps.payments.models import Payment
from config.schema import DashboardSummarySerializer, MonthlyRevenueRowSerializer


class MonthlyRevenueQuerySerializer(serializers.Serializer):
    months = serializers.IntegerField(min_value=1, max_value=120, default=12)


def _balance(invoices):
    billed = invoices.aggregate(total=Sum('total'))['total'] or Decimal('0')
    received = Payment.objects.filter(invoice__in=invoices).aggregate(total=Sum('amount_paid'))['total'] or Decimal('0')
    return to_cents(billed - received)


class DashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=DashboardSummarySerializer)
    def get(self, request):
        user = request.user
        today = timezone.now().date()

        # Revenue is money received, so it sums payments — partial ones included (PAY-3).
        payments = Payment.objects.filter(invoice__user=user)
        total_revenue = to_cents(payments.aggregate(total=Sum('amount_paid'))['total'] or 0)

        # What is still owed, not what was billed: deposits already received come off (PAY-3).
        outstanding_amount = _balance(Invoice.objects.filter(user=user, status__in=['sent', 'overdue']))
        overdue_amount = _balance(Invoice.objects.filter(user=user, status='overdue'))

        start_of_month = today.replace(day=1)
        this_month_revenue = to_cents(
            payments.filter(paid_on__gte=start_of_month).aggregate(total=Sum('amount_paid'))['total'] or 0
        )

        status_counts = Invoice.objects.filter(user=user).values('status').annotate(count=Count('id'))
        status_dict = {item['status']: item['count'] for item in status_counts}

        total_billed = Invoice.objects.filter(user=user).aggregate(total=Sum('total'))['total'] or Decimal('0')
        total_invoices = Invoice.objects.filter(user=user).count()

        return Response(
            {
                'total_revenue': str(total_revenue),
                'outstanding_amount': str(outstanding_amount),
                'overdue_amount': str(overdue_amount),
                'this_month_revenue': str(this_month_revenue),
                'total_billed': str(total_billed),
                'total_invoices': total_invoices,
                'paid_count': status_dict.get('paid', 0),
                'sent_count': status_dict.get('sent', 0),
                'draft_count': status_dict.get('draft', 0),
                'overdue_count': status_dict.get('overdue', 0),
                'status_counts': status_dict,
                'total_clients': Client.objects.filter(user=user, is_archived=False).count(),
            }
        )


class MonthlyRevenueView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(parameters=[MonthlyRevenueQuerySerializer], responses=MonthlyRevenueRowSerializer(many=True))
    def get(self, request):
        user = request.user
        today = timezone.now().date()

        months_param = MonthlyRevenueQuerySerializer(data=request.query_params)
        months_param.is_valid(raise_exception=True)  # ?months=abc used to be a 500 (BUG-17)
        months = months_param.validated_data['months']
        start_date = today - timedelta(days=months * 30)

        monthly_revenue = (
            Payment.objects.filter(invoice__user=user, paid_on__gte=start_date)
            .annotate(month=TruncMonth('paid_on'))
            .values('month')
            .annotate(total=Sum('amount_paid'), count=Count('invoice', distinct=True))
            .order_by('month')
        )

        data = [
            {'month': item['month'].strftime('%Y-%m'), 'total': str(to_cents(item['total'])), 'count': item['count']}
            for item in monthly_revenue
        ]

        return Response(data)
