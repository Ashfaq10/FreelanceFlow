import logging

from django.conf import settings
from django.utils import timezone

from celery import shared_task

from apps.invoices.tasks import send_invoice

from .models import RecurringInvoice
from .services import run_schedule

logger = logging.getLogger(__name__)


@shared_task
def generate_recurring_invoices():
    """Daily: make every due invoice, and queue the ones their owner wants sent automatically."""
    due = RecurringInvoice.objects.filter(is_active=True, next_run__lte=timezone.localdate()).select_related('user')
    made = 0
    for schedule in due:
        invoice = run_schedule(schedule.pk)
        if invoice is None:
            continue
        made += 1
        logger.info('recurring invoice made', extra={'invoice_id': str(invoice.id), 'schedule_id': str(schedule.pk)})
        verified = schedule.user.email_verified or not settings.EMAIL_VERIFICATION_REQUIRED
        if schedule.auto_send and verified and schedule.items.exists():
            send_invoice.delay(str(invoice.id))
    return f'{made} recurring invoices made'
