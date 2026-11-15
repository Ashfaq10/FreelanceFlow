from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.models import Client
from apps.invoices.models import Invoice


class MonthlyRevenueQuerySerializer(serializers.Serializer):
    months = serializers.IntegerField(min_value=1, max_value=120, default=12)


class DashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()

        total_revenue = Invoice.objects.filter(user=user, status='paid').aggregate(total=Sum('total'))[
            'total'
        ] or Decimal('0')

        outstanding_amount = Invoice.objects.filter(user=user, status__in=['sent', 'overdue']).aggregate(
            total=Sum('total')
        )['total'] or Decimal('0')

        overdue_amount = Invoice.objects.filter(user=user, status='overdue').aggregate(total=Sum('total'))[
            'total'
        ] or Decimal('0')

        start_of_month = today.replace(day=1)
        this_month_revenue = Invoice.objects.filter(
            user=user, status='paid', payment__paid_on__gte=start_of_month
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')

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

    def get(self, request):
        user = request.user
        today = timezone.now().date()

        months_param = MonthlyRevenueQuerySerializer(data=request.query_params)
        months_param.is_valid(raise_exception=True)  # ?months=abc used to be a 500 (BUG-17)
        months = months_param.validated_data['months']
        start_date = today - timedelta(days=months * 30)

        monthly_revenue = (
            Invoice.objects.filter(user=user, status='paid', payment__paid_on__gte=start_date)
            .annotate(month=TruncMonth('payment__paid_on'))
            .values('month')
            .annotate(total=Sum('total'), count=Count('id'))
            .order_by('month')
        )

        data = [
            {'month': item['month'].strftime('%Y-%m'), 'total': str(item['total']), 'count': item['count']}
            for item in monthly_revenue
        ]

        return Response(data)
