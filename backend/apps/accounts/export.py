from django.utils import timezone


def export_account(user):
    """Everything the user owns, as plain JSON-able data (files such as the logo are not inlined)."""
    from apps.clients.models import with_totals
    from apps.clients.serializers import ClientSerializer
    from apps.invoices.models import Invoice
    from apps.invoices.serializers import InvoiceDetailSerializer
    from apps.quotes.models import Quote
    from apps.quotes.serializers import QuoteSerializer
    from apps.recurring.models import RecurringInvoice
    from apps.recurring.serializers import RecurringInvoiceSerializer
    from apps.time_tracker.models import TimeLog
    from apps.time_tracker.serializers import TimeLogSerializer

    from .serializers import UserSerializer

    invoices = Invoice.objects.filter(user=user).prefetch_related('items', 'payments', 'credit_notes', 'events')
    return {
        'exported_at': timezone.now().isoformat(),
        'profile': UserSerializer(user).data,
        'clients': ClientSerializer(with_totals(user.clients.all()), many=True).data,
        'invoices': InvoiceDetailSerializer(invoices, many=True).data,
        'quotes': QuoteSerializer(Quote.objects.filter(user=user).prefetch_related('items'), many=True).data,
        'recurring_invoices': RecurringInvoiceSerializer(
            RecurringInvoice.objects.filter(user=user).prefetch_related('items'), many=True
        ).data,
        'time_logs': TimeLogSerializer(TimeLog.objects.filter(user=user), many=True).data,
    }
