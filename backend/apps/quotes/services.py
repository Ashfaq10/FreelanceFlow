from django.core.exceptions import ValidationError
from django.db import transaction

from apps.invoices.models import Invoice, InvoiceItem

from .models import Quote


@transaction.atomic
def convert_quote(quote):
    """Turn a quote into a draft invoice, once. Everything the client agreed to is copied as it stands."""
    quote = Quote.objects.select_for_update().select_related('client', 'user').get(pk=quote.pk)
    if quote.status not in ('draft', 'sent', 'accepted'):
        raise ValidationError(f'A quote that is {quote.status} cannot be converted.')

    invoice = Invoice.objects.create(
        user=quote.user,
        client=quote.client,
        currency=quote.currency,
        tax_rate=quote.tax_rate,
        discount_amount=quote.discount_amount if not quote.discount_percent else 0,
        discount_percent=quote.discount_percent,
        notes=quote.notes,
    )
    lines = [
        InvoiceItem(
            invoice=invoice,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_total=item.line_total,
            tax_rate=item.tax_rate,
            position=item.position,
        )
        for item in quote.items.all()
    ]
    InvoiceItem.objects.bulk_create(lines)
    invoice.save()
    invoice.events.filter(kind='created').update(detail=f'From quote {quote.number}')

    quote.status = 'converted'
    quote.invoice = invoice
    quote.save(update_fields=['status', 'invoice'])
    return invoice
