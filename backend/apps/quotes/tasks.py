import logging

from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string

from celery import shared_task

from apps.invoices.tasks import EMAIL_RETRY
from apps.invoices.utils import get_currency_symbol

from .models import Quote
from .pdf import generate_quote_pdf

logger = logging.getLogger(__name__)


@shared_task(**EMAIL_RETRY)
def send_quote(quote_id):
    """Email the quote with its PDF and the accept link; it counts as sent only once the email left."""
    try:
        quote = Quote.objects.select_related('client', 'user').prefetch_related('items').get(pk=quote_id)
    except Quote.DoesNotExist:
        return f'Quote {quote_id} not found'

    public_url = f'{settings.FRONTEND_URL.rstrip("/")}/quote/{quote.public_token}'
    body = render_to_string(
        'quotes/email/quote_email.html',
        {
            'quote': quote,
            'client': quote.client,
            'user': quote.user,
            'currency_symbol': get_currency_symbol(quote.currency),
            'public_url': public_url,
        },
    )
    email = EmailMessage(
        subject=f'Quote {quote.number} from {quote.user.get_display_name()}',
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[quote.client.email],
    )
    email.content_subtype = 'html'
    email.attach(f'{quote.number}.pdf', generate_quote_pdf(quote), 'application/pdf')
    email.send()
    quote.mark_as_sent()
    logger.info('quote sent', extra={'quote_id': str(quote.id), 'quote_number': quote.number})
    return f'Quote {quote.number} sent to {quote.client.email}'
