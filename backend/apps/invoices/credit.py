from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import CreditNote, Invoice, to_cents


def _next_number(user):
    prefix = f'CN-{timezone.now().year}-'
    numbers = CreditNote.objects.filter(user=user, number__startswith=prefix).values_list('number', flat=True)
    latest = max((int(number.rsplit('-', 1)[-1]) for number in numbers), default=0)
    return f'{prefix}{latest + 1:03d}'


@transaction.atomic
def issue_credit_note(invoice, amount, reason):
    """Lower what a sent invoice owes, and settle it if nothing is left (FEAT-4)."""
    invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)
    if invoice.status not in ('sent', 'overdue'):
        raise ValidationError('Only a sent or overdue invoice can be credited.')

    amount = to_cents(amount)
    if amount <= Decimal('0'):
        raise ValidationError('A credit must be greater than zero.')
    if amount > invoice.amount_due:
        raise ValidationError(f'That is more than the {invoice.amount_due} still due on this invoice.')
    reason = (reason or '').strip()
    if not reason:
        raise ValidationError('Say why the invoice is being credited.')

    for _ in range(10):
        try:
            with transaction.atomic():
                note = CreditNote.objects.create(
                    user=invoice.user, invoice=invoice, number=_next_number(invoice.user), amount=amount, reason=reason
                )
            break
        except IntegrityError:  # two credits raced for the same number
            continue
    else:
        raise IntegrityError('Could not generate a unique credit note number.')

    invoice.log('credit', f'{note.number}: {invoice.currency} {amount} \u2014 {reason}')
    invoice.clear_pay_link()
    if invoice.amount_due <= Decimal('0'):
        if invoice.amount_paid > 0:
            invoice.mark_as_paid()
        else:
            invoice.cancel(f'Fully credited by {note.number}')
    return note
