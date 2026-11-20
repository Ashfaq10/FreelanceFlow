import calendar
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.invoices.models import Invoice, InvoiceItem

from .models import RecurringInvoice


def advance(current, frequency, anchor_day):
    """The run date after `current`. Months stay anchored to the start day: Jan 31 -> Feb 28 -> Mar 31."""
    if frequency == 'weekly':
        return current + timedelta(days=7)
    months = {'monthly': 1, 'quarterly': 3, 'yearly': 12}[frequency]
    index = current.year * 12 + (current.month - 1) + months
    year, month = divmod(index, 12)
    month += 1
    return current.replace(year=year, month=month, day=min(anchor_day, calendar.monthrange(year, month)[1]))


@transaction.atomic
def run_schedule(schedule_id, today=None):
    """Make this schedule's invoice if it is due. Returns the invoice, or None. Safe to call twice."""
    today = today or timezone.localdate()
    schedule = RecurringInvoice.objects.select_for_update().select_related('client', 'user').get(pk=schedule_id)

    if not schedule.is_active or not schedule.user.is_active or schedule.next_run > today:
        return None
    if schedule.end_date and schedule.next_run > schedule.end_date or schedule.client.is_archived:
        schedule.is_active = False
        schedule.save(update_fields=['is_active'])
        return None

    now = timezone.now()
    invoice = Invoice.objects.create(
        user=schedule.user,
        client=schedule.client,
        issue_date=now,
        due_date=now + timedelta(days=schedule.net_days),
        tax_rate=schedule.tax_rate,
        notes=schedule.notes,
        pdf_color=schedule.pdf_color,
        pdf_template=schedule.pdf_template,
        recurring_source=schedule,
    )
    lines = [
        InvoiceItem(
            invoice=invoice,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            tax_rate=item.tax_rate,
            position=item.position,
        )
        for item in schedule.items.all()
    ]
    for line in lines:
        line.line_total = line.compute_line_total()  # bulk_create skips save()
    InvoiceItem.objects.bulk_create(lines)
    invoice.save()  # totals from the stored lines
    invoice.events.filter(kind='created').update(
        detail=f'Recurring: {schedule.get_frequency_display().lower()} schedule'
    )

    # One invoice per run, however many periods were missed: jump to the next future date.
    following = advance(schedule.next_run, schedule.frequency, schedule.start_date.day)
    while following <= today:
        following = advance(following, schedule.frequency, schedule.start_date.day)
    schedule.last_run = today
    schedule.next_run = following
    if schedule.end_date and following > schedule.end_date:
        schedule.is_active = False
    schedule.save(update_fields=['last_run', 'next_run', 'is_active'])
    return invoice
