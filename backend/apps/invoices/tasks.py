import logging

from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils import timezone

from celery import shared_task

from apps.payments.services import CheckoutUnavailable, payment_link

from .utils import get_currency_symbol, public_invoice_url

logger = logging.getLogger(__name__)


@shared_task
def check_overdue_invoices():
    """Mark invoices past due date as overdue and trigger reminder emails."""
    from .models import Invoice

    now = timezone.now()
    overdue_invoices = Invoice.objects.filter(status='sent', due_date__lt=now)

    count = 0
    for invoice in overdue_invoices:
        invoice.mark_as_overdue()
        send_overdue_reminder.delay(str(invoice.id))
        count += 1

    return f'{count} invoices marked as overdue'


@shared_task
def send_due_soon_reminders():
    """Send reminder emails for invoices due in 3 days."""
    from .models import Invoice

    now = timezone.now()
    due_soon_date = now + timezone.timedelta(days=3)

    due_soon_invoices = Invoice.objects.filter(status='sent', due_date__date=due_soon_date.date()).select_related(
        'client', 'user'
    )

    count = 0
    for invoice in due_soon_invoices:
        send_due_soon_email(invoice)
        count += 1

    return f'{count} due-soon reminders sent'


@shared_task
def send_overdue_reminder(invoice_id):
    """Send overdue notification email to client."""
    from .models import Invoice

    try:
        invoice = Invoice.objects.select_related('client', 'user').get(id=invoice_id)
    except Invoice.DoesNotExist:
        return f'Invoice {invoice_id} not found'

    subject = f'Overdue: Invoice {invoice.invoice_number}'
    html_content = render_to_string(
        'invoices/email/overdue_reminder.html',
        {
            'invoice': invoice,
            'client': invoice.client,
            'user': invoice.user,
            'currency_symbol': get_currency_symbol(invoice.currency),
            'public_url': public_invoice_url(invoice),
        },
    )

    email = EmailMessage(
        subject=subject,
        body=html_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[invoice.client.email],
    )
    email.content_subtype = 'html'
    email.send()

    return f'Overdue reminder sent for {invoice.invoice_number}'


@shared_task
def send_reminder(invoice_id):
    """Chase one invoice by hand: overdue notice if it is late, due-soon notice otherwise (FEAT-2)."""
    from .models import Invoice

    try:
        invoice = Invoice.objects.select_related('client', 'user').get(id=invoice_id)
    except Invoice.DoesNotExist:
        return f'Invoice {invoice_id} not found'

    if invoice.status == 'overdue':
        return send_overdue_reminder(invoice_id)

    send_due_soon_email(invoice)
    return f'Reminder sent for {invoice.invoice_number}'


@shared_task
def send_invoice(invoice_id, custom_message=''):
    """Mark sent, render the PDF for that state, then email it — in that order (BUG-9)."""
    from django.core.files.base import ContentFile

    from .models import Invoice
    from .utils import generate_pdf

    try:
        invoice = Invoice.objects.select_related('client', 'user').prefetch_related('items').get(id=invoice_id)
    except Invoice.DoesNotExist:
        return f'Invoice {invoice_id} not found'

    if invoice.status != 'overdue':
        # Re-sending an overdue invoice must not quietly make it look current again (FEAT-2).
        invoice.mark_as_sent()

    pdf_bytes = generate_pdf(invoice)
    invoice.pdf_file.save(f'{invoice.invoice_number}.pdf', ContentFile(pdf_bytes), save=True)

    # The email's "Pay now" block needs a link; an unconfigured or unhappy Stripe must not stop the send.
    try:
        payment_link(invoice)
    except CheckoutUnavailable as exc:
        logger.warning('No pay link for invoice %s: %s', invoice.invoice_number, exc)

    subject = f'Invoice {invoice.invoice_number} from {invoice.user.get_display_name()}'
    html_content = render_to_string(
        'invoices/email/invoice_email.html',
        {
            'invoice': invoice,
            'client': invoice.client,
            'user': invoice.user,
            'custom_message': custom_message,
            'currency_symbol': get_currency_symbol(invoice.currency),
            'public_url': public_invoice_url(invoice),
        },
    )

    email = EmailMessage(
        subject=subject,
        body=html_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[invoice.client.email],
    )
    email.content_subtype = 'html'
    email.attach(f'{invoice.invoice_number}.pdf', pdf_bytes, 'application/pdf')
    email.send()

    return f'Invoice {invoice.invoice_number} sent to {invoice.client.email}'


def send_due_soon_email(invoice):
    """Helper to send due-soon reminder email."""
    subject = f'Reminder: Invoice {invoice.invoice_number} due in 3 days'
    html_content = render_to_string(
        'invoices/email/due_soon_reminder.html',
        {
            'invoice': invoice,
            'client': invoice.client,
            'user': invoice.user,
            'currency_symbol': get_currency_symbol(invoice.currency),
            'public_url': public_invoice_url(invoice),
        },
    )

    email = EmailMessage(
        subject=subject,
        body=html_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[invoice.client.email],
    )
    email.content_subtype = 'html'
    email.send()
