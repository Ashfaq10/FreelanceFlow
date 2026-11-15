from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.shortcuts import render
from django.utils import timezone

from apps.clients.models import Client
from apps.invoices.models import Invoice


@login_required
def dashboard(request):
    user = request.user
    today = timezone.now().date()

    total_revenue = Invoice.objects.filter(user=user, status='paid').aggregate(total=Sum('total'))['total'] or Decimal(
        '0'
    )

    outstanding_amount = Invoice.objects.filter(user=user, status__in=['sent', 'overdue']).aggregate(
        total=Sum('total')
    )['total'] or Decimal('0')

    overdue_amount = Invoice.objects.filter(user=user, status='overdue').aggregate(total=Sum('total'))[
        'total'
    ] or Decimal('0')

    overdue_count = Invoice.objects.filter(user=user, status='overdue').count()

    start_of_month = today.replace(day=1)
    this_month_revenue = Invoice.objects.filter(
        user=user, status='paid', payment__paid_on__gte=start_of_month
    ).aggregate(total=Sum('total'))['total'] or Decimal('0')

    recent_invoices = Invoice.objects.filter(user=user).select_related('client').order_by('-created_at')[:5]

    overdue_invoices = (
        Invoice.objects.filter(user=user, status='overdue').select_related('client').order_by('due_date')[:5]
    )

    status_counts = Invoice.objects.filter(user=user).values('status').annotate(count=Count('id'))
    status_summary = {item['status']: item['count'] for item in status_counts}

    context = {
        'total_revenue': total_revenue,
        'outstanding_amount': outstanding_amount,
        'overdue_amount': overdue_amount,
        'overdue_count': overdue_count,
        'this_month_revenue': this_month_revenue,
        'recent_invoices': recent_invoices,
        'overdue_invoices': overdue_invoices,
        'status_summary': status_summary,
        'total_clients': Client.objects.filter(user=user, is_archived=False).count(),
    }

    return render(request, 'dashboard/index.html', context)


@login_required
def reports(request):
    user = request.user
    today = timezone.now().date()

    twelve_months_ago = today - timedelta(days=365)
    monthly_revenue = (
        Invoice.objects.filter(user=user, status='paid', payment__paid_on__gte=twelve_months_ago)
        .annotate(month=TruncMonth('payment__paid_on'))
        .values('month')
        .annotate(total=Sum('total'), count=Count('id'))
        .order_by('month')
    )

    top_clients = (
        Client.objects.filter(user=user, is_archived=False)
        .annotate(revenue=Sum('invoices__total', filter=Q(invoices__status='paid')), invoice_count=Count('invoices'))
        .filter(revenue__gt=0)
        .order_by('-revenue')[:10]
    )

    all_paid_invoices = Invoice.objects.filter(user=user, status='paid').select_related('payment')
    payment_times = []
    for invoice in all_paid_invoices:
        if hasattr(invoice, 'payment') and invoice.sent_at:
            days = (invoice.payment.paid_on - invoice.sent_at.date()).days
            payment_times.append(days)

    avg_payment_time = sum(payment_times) / len(payment_times) if payment_times else 0

    context = {
        'monthly_revenue': list(monthly_revenue),
        'top_clients': top_clients,
        'avg_payment_time': round(avg_payment_time, 1),
    }

    return render(request, 'dashboard/reports.html', context)
