import pytest
import stripe
from unittest.mock import patch
from django.urls import reverse
from django.utils import timezone

from apps.payments.models import Payment
from .factories import InvoiceItemFactory


@pytest.mark.django_db
class TestPaymentModel:
    def test_payment_creation(self, invoice):
        payment = Payment.objects.create(
            invoice=invoice,
            amount_paid=invoice.total,
            paid_on=timezone.now().date(),
            method='stripe',
            stripe_payment_id='pi_test123'
        )
        
        assert payment.invoice == invoice
        assert payment.is_full_payment is True

    def test_partial_payment(self, invoice):
        InvoiceItemFactory(invoice=invoice, quantity=1, unit_price=100)
        invoice.save()  # totals are recomputed on save, not by a per-item signal (DATA-4)
        
        payment = Payment.objects.create(
            invoice=invoice,
            amount_paid=50,
            paid_on=timezone.now().date(),
            method='stripe'
        )
        
        assert payment.is_full_payment is False


@pytest.mark.django_db
class TestStripeWebhook:
    @patch('apps.payments.views.stripe')
    def test_webhook_invalid_signature(self, mock_stripe, client):
        # Patching the module also replaces stripe.error; keep the real exception class so `except` works.
        mock_stripe.error.SignatureVerificationError = stripe.error.SignatureVerificationError
        mock_stripe.Webhook.construct_event.side_effect = stripe.error.SignatureVerificationError('Invalid signature', 'invalid')
        
        response = client.post(
            reverse('payments:webhook'),
            data='{}',
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='invalid'
        )

        assert response.status_code == 400
