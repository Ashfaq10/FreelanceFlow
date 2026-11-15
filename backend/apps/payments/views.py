from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

import stripe

from apps.invoices.models import Invoice

from .models import Payment

stripe.api_key = settings.STRIPE_SECRET_KEY


def create_checkout_session(request, invoice_id):
    """Create a Stripe Checkout session for an invoice."""
    invoice = get_object_or_404(Invoice, pk=invoice_id, user=request.user, status__in=['draft', 'sent', 'overdue'])

    checkout_session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[
            {
                'price_data': {
                    'currency': invoice.user.currency.lower(),
                    'unit_amount': int(invoice.total * 100),
                    'product_data': {
                        'name': f'Invoice {invoice.invoice_number}',
                        'description': f'Payment for invoice from {invoice.user.get_display_name()}',
                    },
                },
                'quantity': 1,
            }
        ],
        mode='payment',
        success_url=f'{settings.SITE_URL}/invoices/{invoice.id}/?payment=success',
        cancel_url=f'{settings.SITE_URL}/invoices/{invoice.id}/?payment=cancelled',
        metadata={
            'invoice_id': str(invoice.id),
        },
    )

    invoice.stripe_session_id = checkout_session.id
    invoice.stripe_payment_url = checkout_session.url
    invoice.save(update_fields=['stripe_session_id', 'stripe_payment_url'])

    return redirect(checkout_session.url)


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


def handle_successful_payment(session):
    """Mark invoice as paid when checkout session completes."""
    invoice_id = session.get('metadata', {}).get('invoice_id')
    if not invoice_id:
        return

    try:
        invoice = Invoice.objects.get(id=invoice_id)
    except Invoice.DoesNotExist:
        return

    if invoice.status != 'paid':
        invoice.mark_as_paid()

    Payment.objects.create(
        invoice=invoice,
        amount_paid=session['amount_total'] / 100,
        stripe_payment_id=session.get('payment_intent', ''),
        stripe_session_id=session['id'],
        paid_on=timezone.now().date(),
        method='stripe',
    )


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
