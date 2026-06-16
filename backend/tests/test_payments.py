import json
import pytest
from unittest.mock import patch, MagicMock
from django.urls import reverse
from django.utils import timezone

from apps.invoices.models import Invoice
from apps.payments.models import Payment
from .factories import InvoiceFactory, PaymentFactory


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
        invoice.total = 100
        invoice.save()
        
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
    def test_webhook_handles_checkout_completed(self, mock_stripe, client, invoice):
        invoice.status = 'sent'
        invoice.total = 100
        invoice.save()
        
        mock_event = {
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': 'cs_test123',
                    'payment_intent': 'pi_test123',
                    'amount_total': 10000,
                    'metadata': {
                        'invoice_id': str(invoice.id)
                    }
                }
            }
        }
        
        mock_stripe.Webhook.construct_event.return_value = mock_event
        
        response = client.post(
            reverse('payments:webhook'),
            data=json.dumps(mock_event),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        assert response.status_code == 200
        
        invoice.refresh_from_db()
        assert invoice.status == 'paid'
        
        assert Payment.objects.filter(invoice=invoice).exists()

    @patch('apps.payments.views.stripe')
    def test_webhook_invalid_signature(self, mock_stripe, client):
        mock_stripe.Webhook.construct_event.side_effect = Exception('Invalid signature')
        
        response = client.post(
            reverse('payments:webhook'),
            data='{}',
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='invalid'
        )
        
        assert response.status_code == 400


@pytest.mark.django_db
class TestCreateCheckoutSession:
    @patch('apps.payments.views.stripe')
    def test_create_checkout_session(self, mock_stripe, authenticated_client, invoice):
        mock_session = MagicMock()
        mock_session.id = 'cs_test123'
        mock_session.url = 'https://checkout.stripe.com/test'
        mock_stripe.checkout.Session.create.return_value = mock_session
        
        response = authenticated_client.get(
            reverse('payments:checkout', kwargs={'invoice_id': invoice.pk})
        )
        
        assert response.status_code == 302
        assert response.url == 'https://checkout.stripe.com/test'
        
        invoice.refresh_from_db()
        assert invoice.stripe_session_id == 'cs_test123'

    def test_checkout_not_allowed_for_paid_invoice(self, authenticated_client, invoice):
        invoice.status = 'paid'
        invoice.save()
        
        response = authenticated_client.get(
            reverse('payments:checkout', kwargs={'invoice_id': invoice.pk})
        )
        
        assert response.status_code == 404
