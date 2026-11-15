import logging
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

import stripe

from apps.invoices.models import Invoice, to_cents

from .models import Payment

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
        session = event['data']['object']
        handle_successful_payment(session)
    elif event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        handle_payment_intent_succeeded(payment_intent)

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
    if amount_paid != invoice.total:
        logger.error(
            'Stripe session %s paid %s but invoice %s totals %s; not recording',
            session.get('id'),
            amount_paid,
            invoice.invoice_number,
            invoice.total,
        )
        return

    if invoice.status == 'paid':
        # Replayed event, or the invoice was already settled manually.
        return

    Payment.objects.update_or_create(
        invoice=invoice,
        defaults={
            'amount_paid': amount_paid,
            'stripe_payment_id': session.get('payment_intent', ''),
            'stripe_session_id': session.get('id', ''),
            'paid_on': timezone.now().date(),
            'method': 'stripe',
        },
    )
    invoice.mark_as_paid()


def handle_payment_intent_succeeded(payment_intent):
    """Handle payment intent succeeded event."""
    pass


def payment_success(request, invoice_id):
    """Payment success callback page."""
    invoice = get_object_or_404(Invoice, pk=invoice_id)
    return redirect('invoices:detail', pk=invoice.pk)


def payment_cancelled(request, invoice_id):
    """Payment cancelled callback page."""
    invoice = get_object_or_404(Invoice, pk=invoice_id)
    return redirect('invoices:detail', pk=invoice.pk)
