"""Stripe Checkout sessions for invoices (PAY-2)."""

import logging

from django.conf import settings

import stripe

from apps.invoices.models import to_cents

logger = logging.getLogger(__name__)

PAYABLE_STATUSES = ('sent', 'overdue')


class CheckoutUnavailable(Exception):
    """Stripe is not configured, or refused the request."""


def payment_link(invoice):
    """Return a Checkout URL for the invoice, reusing the open session if there is one."""
    if not settings.STRIPE_SECRET_KEY:
        raise CheckoutUnavailable('Stripe is not configured.')

    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        if invoice.stripe_session_id:
            session = stripe.checkout.Session.retrieve(invoice.stripe_session_id)
            # Reuse while it is still payable; expired sessions 404 the client.
            if session.get('status') == 'open' and session.get('url'):
                return session['url']

        session = _create_session(invoice)
    except stripe.error.StripeError as exc:
        logger.exception('Stripe checkout failed for invoice %s', invoice.invoice_number)
        raise CheckoutUnavailable(str(exc)) from exc

    invoice.stripe_session_id = session['id']
    invoice.stripe_payment_url = session['url']
    invoice.save(update_fields=['stripe_session_id', 'stripe_payment_url'])
    return session['url']


def _create_session(invoice):
    user = invoice.user
    return stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[
            {
                'price_data': {
                    'currency': (user.currency or 'USD').lower(),
                    # Decimal cents, never float arithmetic (DATA-3).
                    'unit_amount': int(to_cents(invoice.total) * 100),
                    'product_data': {
                        'name': f'Invoice {invoice.invoice_number}',
                        'description': f'Payment for invoice from {user.get_display_name()}',
                    },
                },
                'quantity': 1,
            }
        ],
        mode='payment',
        success_url=f'{settings.FRONTEND_URL}/invoices/{invoice.id}?payment=success',
        cancel_url=f'{settings.FRONTEND_URL}/invoices/{invoice.id}?payment=cancelled',
        metadata={'invoice_id': str(invoice.id)},
    )
