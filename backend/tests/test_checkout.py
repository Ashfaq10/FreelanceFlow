"""The SPA can create a Stripe pay link for its own sent invoices (PAY-2)."""

from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from rest_framework.test import APIClient

from apps.invoices.models import InvoiceItem

from .factories import InvoiceFactory, UserFactory

SESSION = {'id': 'cs_test_new', 'url': 'https://checkout.stripe.test/cs_test_new', 'status': 'open'}


@pytest.fixture
def sent_invoice(db, user, client_obj):
    invoice = InvoiceFactory(user=user, client=client_obj, status='sent')
    InvoiceItem.objects.create(invoice=invoice, description='Work', quantity=1, unit_price=Decimal('1234.56'))
    invoice.save()
    return invoice


@pytest.fixture
def stripe_mock(settings):
    settings.STRIPE_SECRET_KEY = 'sk_test_123'
    with patch('apps.payments.services.stripe') as mock:
        mock.checkout.Session.create.return_value = SESSION
        mock.error.StripeError = Exception
        yield mock


@pytest.mark.django_db
class TestCheckoutEndpoint:
    def test_creates_a_session_and_stores_the_link(self, api_client, sent_invoice, stripe_mock):
        response = api_client.post(f'/api/invoices/{sent_invoice.id}/checkout/')

        assert response.status_code == 200
        assert response.data['url'] == SESSION['url']
        sent_invoice.refresh_from_db()
        assert sent_invoice.stripe_payment_url == SESSION['url']
        assert sent_invoice.stripe_session_id == SESSION['id']

    def test_charges_the_invoice_total_in_cents(self, api_client, sent_invoice, stripe_mock):
        api_client.post(f'/api/invoices/{sent_invoice.id}/checkout/')

        line_item = stripe_mock.checkout.Session.create.call_args.kwargs['line_items'][0]
        assert line_item['price_data']['unit_amount'] == 123456  # 1234.56, not float arithmetic

    def test_reuses_an_open_session(self, api_client, sent_invoice, stripe_mock):
        sent_invoice.stripe_session_id = 'cs_existing'
        sent_invoice.save(update_fields=['stripe_session_id'])
        stripe_mock.checkout.Session.retrieve.return_value = {
            'id': 'cs_existing',
            'url': 'https://checkout.stripe.test/cs_existing',
            'status': 'open',
        }

        response = api_client.post(f'/api/invoices/{sent_invoice.id}/checkout/')

        assert response.data['url'] == 'https://checkout.stripe.test/cs_existing'
        stripe_mock.checkout.Session.create.assert_not_called()

    def test_replaces_an_expired_session(self, api_client, sent_invoice, stripe_mock):
        sent_invoice.stripe_session_id = 'cs_expired'
        sent_invoice.save(update_fields=['stripe_session_id'])
        stripe_mock.checkout.Session.retrieve.return_value = {'id': 'cs_expired', 'status': 'expired', 'url': None}

        response = api_client.post(f'/api/invoices/{sent_invoice.id}/checkout/')

        assert response.data['url'] == SESSION['url']
        stripe_mock.checkout.Session.create.assert_called_once()

    def test_draft_invoices_cannot_be_paid(self, api_client, invoice, stripe_mock):
        assert invoice.status == 'draft'

        response = api_client.post(f'/api/invoices/{invoice.id}/checkout/')

        assert response.status_code == 400
        stripe_mock.checkout.Session.create.assert_not_called()

    def test_another_users_invoice_is_not_found(self, sent_invoice, stripe_mock):
        other = APIClient()
        other.force_authenticate(user=UserFactory())

        assert other.post(f'/api/invoices/{sent_invoice.id}/checkout/').status_code == 404

    def test_anonymous_request_is_rejected(self, sent_invoice):
        assert APIClient().post(f'/api/invoices/{sent_invoice.id}/checkout/').status_code in (401, 403)

    def test_unconfigured_stripe_says_so(self, api_client, sent_invoice, settings):
        settings.STRIPE_SECRET_KEY = ''

        response = api_client.post(f'/api/invoices/{sent_invoice.id}/checkout/')

        assert response.status_code == 503


@pytest.mark.django_db
class TestSendCreatesPayLink:
    def test_sending_creates_the_pay_link(self, invoice, stripe_mock, mailoutbox):
        InvoiceItem.objects.create(invoice=invoice, description='Work', quantity=1, unit_price=Decimal('10.00'))
        invoice.save()

        with patch('apps.invoices.utils.generate_pdf', return_value=b'PDF'):
            from apps.invoices.tasks import send_invoice

            send_invoice(str(invoice.id))

        invoice.refresh_from_db()
        # The email links the public invoice page (FEAT-3); this is the link its Pay button uses.
        assert invoice.stripe_payment_url == SESSION['url']
        assert f'/pay/{invoice.public_token}' in mailoutbox[0].body

    def test_send_survives_stripe_being_down(self, invoice, settings, mailoutbox):
        settings.STRIPE_SECRET_KEY = ''  # Stripe not configured at all
        InvoiceItem.objects.create(invoice=invoice, description='Work', quantity=1, unit_price=Decimal('10.00'))
        invoice.save()

        with patch('apps.invoices.utils.generate_pdf', return_value=b'PDF'):
            from apps.invoices.tasks import send_invoice

            send_invoice(str(invoice.id))

        invoice.refresh_from_db()
        assert invoice.status == 'sent'
        assert len(mailoutbox) == 1


@pytest.mark.django_db
def test_stripe_failure_is_reported_not_swallowed(api_client, sent_invoice, stripe_mock):
    class Boom(Exception):
        pass

    stripe_mock.error.StripeError = Boom
    stripe_mock.checkout.Session.create.side_effect = Boom('card_error')

    response = api_client.post(f'/api/invoices/{sent_invoice.id}/checkout/')

    assert response.status_code == 503
    assert 'card_error' in response.data['error']
