import csv
from decimal import Decimal

from django.db.models import DecimalField, Sum, Value
from django.db.models.functions import Coalesce
from django.http import HttpResponse

from drf_spectacular.utils import extend_schema
from rest_framework import permissions
from rest_framework.views import APIView

from apps.invoices.models import Invoice, to_cents
from apps.payments.models import Payment
from apps.time_tracker.models import TimeLog

FORMULA_STARTS = ('=', '+', '-', '@', '\t', '\r')


def _cell(value):
    """Text a spreadsheet would run as a formula gets a leading quote; numbers pass through untouched."""
    if value is None:
        return ''
    if isinstance(value, Decimal):
        return f'{value:.2f}'
    if hasattr(value, 'isoformat'):
        return value.date().isoformat() if hasattr(value, 'date') else value.isoformat()
    text = str(value)
    return f"'{text}" if text.startswith(FORMULA_STARTS) else text


class CSVExportView(APIView):
    """Subclasses set `filename`, `header` and implement `rows(user)`; everything is scoped to `request.user`."""

    permission_classes = [permissions.IsAuthenticated]
    filename = ''
    header = ()

    def rows(self, user):
        raise NotImplementedError

    @extend_schema(responses={(200, 'text/csv'): str})
    def get(self, request):
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{self.filename}"'
        writer = csv.writer(response)
        writer.writerow(self.header)
        for row in self.rows(request.user):
            writer.writerow([_cell(value) for value in row])
        return response


class InvoicesExportView(CSVExportView):
    filename = 'freelanceflow-invoices.csv'
    header = (
        'Invoice number', 'Client', 'Status', 'Issue date', 'Due date', 'Currency',
        'Subtotal', 'Discount', 'Tax rate %', 'Tax', 'Total', 'Paid', 'Balance due',
    )  # fmt: skip

    def rows(self, user):
        invoices = (
            Invoice.objects.filter(user=user)
            .select_related('client')
            .annotate(paid=Coalesce(Sum('payments__amount_paid'), Value(Decimal('0')), output_field=DecimalField()))
        )
        for i in invoices:
            yield (
                i.invoice_number, i.client.name, i.status, i.issue_date, i.due_date, i.currency,
                i.subtotal, i.discount_amount, i.tax_rate, i.tax_amount, i.total, i.paid,
                to_cents(i.total - i.paid),
            )  # fmt: skip


class PaymentsExportView(CSVExportView):
    filename = 'freelanceflow-payments.csv'
    header = ('Paid on', 'Invoice number', 'Client', 'Currency', 'Amount', 'Method', 'Notes')

    def rows(self, user):
        payments = Payment.objects.filter(invoice__user=user).select_related('invoice__client')
        for p in payments:
            # Refunds are negative payments (PAY-4); they stay numbers.
            yield (p.paid_on, p.invoice.invoice_number, p.invoice.client.name, p.invoice.currency,
                   p.amount_paid, p.get_method_display(), p.notes)  # fmt: skip


class TimeLogsExportView(CSVExportView):
    filename = 'freelanceflow-time-logs.csv'
    header = ('Date', 'Client', 'Description', 'Hours', 'Hourly rate', 'Amount', 'Billed', 'Invoice number')

    def rows(self, user):
        logs = TimeLog.objects.filter(user=user).select_related('client', 'invoice')
        for t in logs:
            yield (t.work_date, t.client.name, t.description, t.hours, t.hourly_rate, t.total_amount,
                   'yes' if t.is_billed else 'no', t.invoice.invoice_number if t.invoice else '')  # fmt: skip
