"""Turn tracked hours into invoice lines (FEAT-1)."""

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.invoices.models import Invoice, InvoiceItem


@transaction.atomic
def bill_time_logs(user, time_logs, invoice=None):
    """Add one invoice line per time log and mark the logs billed.

    `invoice` must be a draft of the same client; without one a new draft is created.
    """
    time_logs = list(time_logs)
    if not time_logs:
        raise ValidationError('Select at least one time log.')

    if any(log.is_billed for log in time_logs):
        raise ValidationError('Some of those time logs are already billed.')

    client_ids = {log.client_id for log in time_logs}
    if len(client_ids) > 1:
        raise ValidationError('Time logs for different clients cannot go on one invoice.')

    unrated = [log for log in time_logs if log.hourly_rate is None]
    if unrated:
        raise ValidationError('Set an hourly rate on every time log before billing it.')

    client_id = client_ids.pop()
    if invoice is None:
        invoice = Invoice.objects.create(user=user, client_id=client_id)
    elif invoice.status != 'draft':
        raise ValidationError('Only draft invoices can take more lines.')
    elif invoice.client_id != client_id:
        raise ValidationError('Those time logs belong to a different client than the invoice.')

    items = []
    for log in time_logs:
        item = InvoiceItem(
            invoice=invoice,
            description=f'{log.description} ({log.work_date:%d %b %Y})',
            quantity=log.hours,
            unit_price=log.hourly_rate,
        )
        # bulk_create skips save(), so the line total is computed here (DATA-4).
        item.line_total = item.compute_line_total()
        items.append(item)

    InvoiceItem.objects.bulk_create(items)
    invoice.save()  # recalculates totals from the stored items

    ids = [log.id for log in time_logs]
    type(time_logs[0]).objects.filter(id__in=ids).update(invoice=invoice, is_billed=True)

    return invoice
