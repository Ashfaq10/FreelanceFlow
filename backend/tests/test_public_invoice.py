"""The client's tokenized invoice page (FEAT-3)."""

from decimal import Decimal
from unittest.mock import patch

from django.core.cache import cache

import pytest
from rest_framework.test import APIClient

from apps.invoices.models import InvoiceItem

from .factories import InvoiceFactory


@pytest.fixture
def sent_invoice(db, user, client_obj):
    invoice = InvoiceFactory(user=user, client=client_obj, status='sent')
    InvoiceItem.objects.create(invoice=invoice, description='Work', quantity=2, unit_price=Decimal('150.00'))
    invoice.save()
    return invoice


@pytest.fixture
def anon():
    return APIClient()


@pytest.mark.django_db
class TestPublicInvoicePage:
    def test_the_link_shows_the_invoice_without_a_login(self, anon, sent_invoice):
        response = anon.get(f'/api/public/invoices/{sent_invoice.public_token}/')

        assert response.status_code == 200
        assert response.data['invoice_number'] == sent_invoice.invoice_number
        assert response.data['total'] == '300.00'
        assert response.data['amount_due'] == '300.00'
        assert [item['description'] for item in response.data['items']] == ['Work']

    def test_it_leaks_nothing_about_the_account(self, anon, sent_invoice):
        response = anon.get(f'/api/public/invoices/{sent_invoice.public_token}/')

        for field in ('id', 'client', 'user', 'pdf_file', 'stripe_payment_url', 'user_email'):
            assert field not in response.data

    def test_a_wrong_token_is_a_404(self, anon):
        assert anon.get('/api/public/invoices/deadbeef/').status_code == 404

    def test_drafts_are_not_visible(self, anon, invoice):
        assert invoice.status == 'draft'

        assert anon.get(f'/api/public/invoices/{invoice.public_token}/').status_code == 404

    def test_cancelled_invoices_are_not_visible(self, anon, sent_invoice):
        sent_invoice.cancel()

        assert anon.get(f'/api/public/invoices/{sent_invoice.public_token}/').status_code == 404

    def test_a_paid_invoice_still_shows_as_a_receipt(self, anon, sent_invoice):
        sent_invoice.mark_as_paid()

        response = anon.get(f'/api/public/invoices/{sent_invoice.public_token}/')

        assert response.status_code == 200
        assert response.data['status'] == 'paid'

    def test_the_pdf_downloads(self, anon, sent_invoice):
        with patch('apps.invoices.public_views.generate_pdf', return_value=b'PDF'):
            response = anon.get(f'/api/public/invoices/{sent_invoice.public_token}/pdf/')

        assert response.status_code == 200
        assert response['Content-Type'] == 'application/pdf'

    def test_every_invoice_gets_its_own_token(self, user, client_obj):
        first = InvoiceFactory(user=user, client=client_obj)
        second = InvoiceFactory(user=user, client=client_obj)

        assert first.public_token and second.public_token
        assert first.public_token != second.public_token


@pytest.mark.django_db
class TestPublicCheckout:
    def test_the_client_can_start_a_payment(self, anon, sent_invoice, settings):
        settings.STRIPE_SECRET_KEY = 'sk_test_123'

        with patch('apps.payments.services.stripe') as stripe_mock:
            stripe_mock.checkout.Session.create.return_value = {
                'id': 'cs_1',
                'url': 'https://checkout.stripe.test/cs_1',
                'status': 'open',
            }
            stripe_mock.error.StripeError = Exception
            response = anon.post(f'/api/public/invoices/{sent_invoice.public_token}/checkout/')

        assert response.status_code == 200
        assert response.data['url'] == 'https://checkout.stripe.test/cs_1'

    def test_a_paid_invoice_cannot_be_paid_again(self, anon, sent_invoice):
        sent_invoice.mark_as_paid()

        response = anon.post(f'/api/public/invoices/{sent_invoice.public_token}/checkout/')

        assert response.status_code == 400

    def test_stripe_errors_are_not_quoted_at_the_client(self, anon, sent_invoice, settings):
        settings.STRIPE_SECRET_KEY = ''  # misconfigured on our side

        response = anon.post(f'/api/public/invoices/{sent_invoice.public_token}/checkout/')

        assert response.status_code == 503
        assert 'Stripe' not in response.data['error']


@pytest.mark.django_db
def test_token_guessing_is_throttled(anon):
    from apps.invoices.public_views import PublicInvoiceThrottle

    cache.clear()

    with patch.object(PublicInvoiceThrottle, 'rate', '3/hour', create=True):
        statuses = [anon.get(f'/api/public/invoices/guess{n}/').status_code for n in range(5)]

    assert statuses[-1] == 429


@pytest.mark.django_db
def test_the_email_carries_the_public_link(sent_invoice, mailoutbox):
    sent_invoice.status = 'draft'
    sent_invoice.save(update_fields=['status'])

    with patch('apps.invoices.utils.generate_pdf', return_value=b'PDF'):
        from apps.invoices.tasks import send_invoice

        send_invoice(str(sent_invoice.id))

    assert f'/pay/{sent_invoice.public_token}' in mailoutbox[0].body
