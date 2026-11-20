"""Stripe Checkout sessions and payment recording for invoices (PAY-2, PAY-3)."""

import logging
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction

import stripe

from apps.invoices.models import Invoice, to_cents

from .models import Payment

logger = logging.getLogger(__name__)

PAYABLE_STATUSES = ('sent', 'overdue')


class CheckoutUnavailable(Exception):
    """Stripe is not configured, or refused the request."""


@transaction.atomic
def record_payment(invoice, amount, method='manual', paid_on=None, notes='', **stripe_ids):
    """Record a (possibly partial) payment and settle the invoice once nothing is due (PAY-3)."""
    invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)

    if invoice.status not in PAYABLE_STATUSES:
        raise ValidationError(f'A {invoice.status} invoice cannot take a payment.')

    amount = to_cents(amount)
    if amount <= Decimal('0'):
        raise ValidationError('A payment must be greater than zero.')
    if amount > invoice.amount_due:
        raise ValidationError(f'That is more than the {invoice.amount_due} still due on this invoice.')

    payment = Payment.objects.create(
        invoice=invoice,
        amount_paid=amount,
        method=method,
        notes=notes,
        **({'paid_on': paid_on} if paid_on else {}),
        **stripe_ids,
    )
    invoice.log('payment', f'{invoice.currency} {amount} ({payment.get_method_display()})')
    invoice.clear_pay_link()

    if invoice.amount_due <= Decimal('0') and invoice.status != 'paid':
        invoice.mark_as_paid()

    return payment


def expire_session(session_id):
    """Stop a Checkout session that was priced for an old balance from being paid. Best effort: Stripe may be
    down or unconfigured, and an already-expired session answers with an error we can ignore."""
    if not session_id or not settings.STRIPE_SECRET_KEY:
        return
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        stripe.checkout.Session.expire(session_id)
    except stripe.error.StripeError:
        logger.warning('Could not expire Stripe session %s', session_id, exc_info=True)


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
                    'currency': (invoice.currency or user.currency or 'USD').lower(),
                    # Decimal cents, never float arithmetic (DATA-3).
                    'unit_amount': int(to_cents(invoice.amount_due) * 100),
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
