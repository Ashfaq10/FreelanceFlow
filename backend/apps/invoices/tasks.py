from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils import timezone


@shared_task
def check_overdue_invoices():
    """Mark invoices past due date as overdue and trigger reminder emails."""
    from .models import Invoice
    
    now = timezone.now()
    overdue_invoices = Invoice.objects.filter(
        status='sent',
        due_date__lt=now
    )
    
    count = 0
    for invoice in overdue_invoices:
        invoice.status = 'overdue'
        invoice.save(update_fields=['status'])
        send_overdue_reminder.delay(str(invoice.id))
        count += 1
    
    return f'{count} invoices marked as overdue'


@shared_task
def send_due_soon_reminders():
    """Send reminder emails for invoices due in 3 days."""
    from .models import Invoice
    
    now = timezone.now()
    due_soon_date = now + timezone.timedelta(days=3)
    
    due_soon_invoices = Invoice.objects.filter(
        status='sent',
        due_date__date=due_soon_date.date()
    ).select_related('client', 'user')
    
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
    html_content = render_to_string('invoices/email/overdue_reminder.html', {
        'invoice': invoice,
        'client': invoice.client,
        'user': invoice.user,
    })
    
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
def generate_and_store_pdf(invoice_id):
    """Generate PDF and store it in file storage."""
    from django.core.files.base import ContentFile
    from .models import Invoice
    from .utils import generate_pdf
    
    try:
        invoice = Invoice.objects.select_related(
            'client', 'user'
        ).prefetch_related('items').get(id=invoice_id)
    except Invoice.DoesNotExist:
        return f'Invoice {invoice_id} not found'
    
    pdf_bytes = generate_pdf(invoice)
    filename = f'{invoice.invoice_number}.pdf'
    invoice.pdf_file.save(filename, ContentFile(pdf_bytes), save=True)
    
    return f'PDF generated for {invoice.invoice_number}'


@shared_task
def send_invoice_email(invoice_id, custom_message=''):
    """Send invoice email with PDF attachment."""
    from .models import Invoice
    from .utils import generate_pdf
    
    try:
        invoice = Invoice.objects.select_related(
            'client', 'user'
        ).prefetch_related('items').get(id=invoice_id)
    except Invoice.DoesNotExist:
        return f'Invoice {invoice_id} not found'
    
    subject = f'Invoice {invoice.invoice_number} from {invoice.user.get_display_name()}'
    html_content = render_to_string('invoices/email/invoice_email.html', {
        'invoice': invoice,
        'client': invoice.client,
        'user': invoice.user,
        'custom_message': custom_message,
    })
    
    if invoice.pdf_file:
        pdf_content = invoice.pdf_file.read()
    else:
        pdf_content = generate_pdf(invoice)
    
    email = EmailMessage(
        subject=subject,
        body=html_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[invoice.client.email],
    )
    email.content_subtype = 'html'
    email.attach(f'{invoice.invoice_number}.pdf', pdf_content, 'application/pdf')
    email.send()
    
    invoice.mark_as_sent()
    
    return f'Invoice {invoice.invoice_number} sent to {invoice.client.email}'


def send_due_soon_email(invoice):
    """Helper to send due-soon reminder email."""
    subject = f'Reminder: Invoice {invoice.invoice_number} due in 3 days'
    html_content = render_to_string('invoices/email/due_soon_reminder.html', {
        'invoice': invoice,
        'client': invoice.client,
        'user': invoice.user,
    })
    
    email = EmailMessage(
        subject=subject,
        body=html_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[invoice.client.email],
    )
    email.content_subtype = 'html'
    email.send()
