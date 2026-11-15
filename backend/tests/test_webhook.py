"""The Stripe webhook is replay-safe and checks what it is told (PAY-1)."""
import json
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.urls import reverse

from apps.invoices.models import InvoiceItem
from apps.payments.models import Payment

from .factories import InvoiceFactory


@pytest.fixture
def sent_invoice(db, user, client_obj):
    invoice = InvoiceFactory(user=user, client=client_obj, status='sent')
    InvoiceItem.objects.create(invoice=invoice, description='Work', quantity=1, unit_price=Decimal('100.00'))
    invoice.save()
    return invoice


def checkout_event(invoice, amount_cents=10000, payment_status='paid', session_id='cs_test123'):
    return {
        'type': 'checkout.session.completed',
        'data': {
            'object': {
                'id': session_id,
                'payment_intent': 'pi_test123',
                'amount_total': amount_cents,
                'payment_status': payment_status,
                'metadata': {'invoice_id': str(invoice.id)},
            }
        },
    }


def post(client, event):
    return client.post(
        reverse('payments:webhook'),
        data=json.dumps(event),
        content_type='application/json',
        HTTP_STRIPE_SIGNATURE='test_signature',
    )


@pytest.mark.django_db
class TestWebhookIdempotency:
    @patch('apps.payments.views.stripe')
    def test_replayed_event_records_one_payment(self, mock_stripe, client, sent_invoice):
        event = checkout_event(sent_invoice)
        mock_stripe.Webhook.construct_event.return_value = event

        first = post(client, event)
        second = post(client, event)

        assert first.status_code == 200
        assert second.status_code == 200
        assert Payment.objects.filter(invoice=sent_invoice).count() == 1
        sent_invoice.refresh_from_db()
        assert sent_invoice.status == 'paid'

    @patch('apps.payments.views.stripe')
    def test_event_for_an_already_paid_invoice_is_accepted(self, mock_stripe, client, sent_invoice):
        sent_invoice.mark_as_paid()
        Payment.objects.create(invoice=sent_invoice, amount_paid=sent_invoice.total, method='manual')
        event = checkout_event(sent_invoice)
        mock_stripe.Webhook.construct_event.return_value = event

        response = post(client, event)

        assert response.status_code == 200
        assert Payment.objects.filter(invoice=sent_invoice).count() == 1
        assert Payment.objects.get(invoice=sent_invoice).method == 'manual'


@pytest.mark.django_db
class TestWebhookChecks:
    @patch('apps.payments.views.stripe')
    def test_unpaid_session_does_not_mark_the_invoice_paid(self, mock_stripe, client, sent_invoice):
        event = checkout_event(sent_invoice, payment_status='unpaid')
        mock_stripe.Webhook.construct_event.return_value = event

        response = post(client, event)

        assert response.status_code == 200
        sent_invoice.refresh_from_db()
        assert sent_invoice.status == 'sent'
        assert not Payment.objects.filter(invoice=sent_invoice).exists()

    @patch('apps.payments.views.stripe')
    def test_amount_mismatch_is_not_recorded(self, mock_stripe, client, sent_invoice):
        event = checkout_event(sent_invoice, amount_cents=5000)  # invoice total is 100.00
        mock_stripe.Webhook.construct_event.return_value = event

        response = post(client, event)

        assert response.status_code == 200
        sent_invoice.refresh_from_db()
        assert sent_invoice.status == 'sent'
        assert not Payment.objects.filter(invoice=sent_invoice).exists()

    @patch('apps.payments.views.stripe')
    def test_amount_is_stored_as_decimal_cents(self, mock_stripe, client, user, client_obj):
        invoice = InvoiceFactory(user=user, client=client_obj, status='sent')
        InvoiceItem.objects.create(invoice=invoice, description='Work', quantity=1, unit_price=Decimal('10.07'))
        invoice.save()
        event = checkout_event(invoice, amount_cents=1007)
        mock_stripe.Webhook.construct_event.return_value = event

        post(client, event)

        assert Payment.objects.get(invoice=invoice).amount_paid == Decimal('10.07')

    @patch('apps.payments.views.stripe')
    def test_unknown_invoice_is_acknowledged(self, mock_stripe, client, sent_invoice):
        event = checkout_event(sent_invoice)
        event['data']['object']['metadata']['invoice_id'] = '00000000-0000-0000-0000-000000000000'
        mock_stripe.Webhook.construct_event.return_value = event

        assert post(client, event).status_code == 200
