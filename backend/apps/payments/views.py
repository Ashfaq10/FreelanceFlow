import logging
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

import stripe

from apps.invoices.models import Invoice, to_cents

from .models import Payment
from .services import record_payment

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY


@csrf_exempt
@require_POST
def stripe_webhook(request):
    """Handle Stripe webhook events."""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except ValueError:
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError:
        return HttpResponse(status=400)

    if event['type'] == 'checkout.session.completed':
        handle_successful_payment(event['data']['object'])
    elif event['type'] == 'charge.refunded':
        handle_refund(event['data']['object'])
    elif event['type'] == 'checkout.session.expired':
        handle_expired_session(event['data']['object'])

    return HttpResponse(status=200)


@transaction.atomic
def handle_successful_payment(session):
    """Record a Stripe payment once, after checking the event says what we expect (PAY-1)."""
    invoice_id = (session.get('metadata') or {}).get('invoice_id')
    if not invoice_id:
        return

    try:
        invoice = Invoice.objects.select_for_update().get(id=invoice_id)
    except (Invoice.DoesNotExist, DjangoValidationError, ValueError):
        logger.warning('Stripe session %s references unknown invoice %s', session.get('id'), invoice_id)
        return

    if session.get('payment_status') != 'paid':
        logger.warning(
            'Stripe session %s for invoice %s is %s, not paid',
            session.get('id'),
            invoice_id,
            session.get('payment_status'),
        )
        return

    amount_paid = to_cents(Decimal(session.get('amount_total') or 0) / 100)
    if amount_paid != invoice.amount_due:
        logger.error(
            'Stripe session %s paid %s but invoice %s has %s due; not recording',
            session.get('id'),
            amount_paid,
            invoice.invoice_number,
            invoice.amount_due,
        )
        return

    if Payment.objects.filter(stripe_session_id=session.get('id', '')).exists():
        # Replayed event: this session has already been recorded (PAY-1).
        return

    try:
        record_payment(
            invoice,
            amount_paid,
            method='stripe',
            stripe_payment_id=session.get('payment_intent', ''),
            stripe_session_id=session.get('id', ''),
        )
    except DjangoValidationError as exc:
        # Someone recorded a payment by hand between send and checkout; do not invent a balance.
        logger.error(
            'Stripe session %s paid %s but invoice %s only has %s due: %s',
            session.get('id'),
            amount_paid,
            invoice.invoice_number,
            invoice.amount_due,
            exc.messages[0],
        )


@transaction.atomic
def handle_refund(charge):
    """Give the money back in our ledger too, so the invoice owes again (PAY-4)."""
    payment_intent = charge.get('payment_intent')
    if not payment_intent:
        return

    payments = Payment.objects.select_related('invoice').filter(stripe_payment_id=payment_intent)
    if not payments:
        logger.warning('Refund for unknown payment intent %s', payment_intent)
        return

    invoice = Invoice.objects.select_for_update().get(pk=payments[0].invoice_id)
    refunded_total = to_cents(Decimal(charge.get('amount_refunded') or 0) / 100)
    already_refunded = -sum((payment.amount_paid for payment in payments if payment.amount_paid < 0), Decimal('0'))
    outstanding_refund = refunded_total - already_refunded
    if outstanding_refund <= 0:
        # Stripe redelivers `charge.refunded` after every later refund on the same charge.
        return

    was_paid = invoice.status == 'paid'
    Payment.objects.create(
        invoice=invoice,
        amount_paid=-outstanding_refund,
        method='stripe',
        stripe_payment_id=payment_intent,
        notes=f'Refund of {outstanding_refund}',
    )
    invoice.log('refund', f'{invoice.currency} {outstanding_refund}')

    if was_paid and invoice.amount_due > 0:
        invoice.reopen_after_refund()


def handle_expired_session(session):
    """The pay link is dead; drop it so the next request mints a fresh one (PAY-4)."""
    Invoice.objects.filter(stripe_session_id=session.get('id', '')).update(stripe_session_id='', stripe_payment_url='')
