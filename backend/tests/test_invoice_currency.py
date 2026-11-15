"""An invoice keeps the currency it was written in (DATA-7)."""

from decimal import Decimal
from unittest.mock import patch

import pytest

from apps.invoices.models import InvoiceItem
from apps.invoices.utils import build_pdf_context

from .factories import ClientFactory, InvoiceFactory, UserFactory


@pytest.fixture
def euro_user(db):
    return UserFactory(currency='EUR')


@pytest.mark.django_db
class TestInvoiceCurrency:
    def test_new_invoices_take_the_users_currency(self, euro_user):
        invoice = InvoiceFactory(user=euro_user, client=ClientFactory(user=euro_user))

        assert invoice.currency == 'EUR'

    def test_changing_the_account_currency_leaves_old_invoices_alone(self, euro_user):
        invoice = InvoiceFactory(user=euro_user, client=ClientFactory(user=euro_user))

        euro_user.currency = 'USD'
        euro_user.save(update_fields=['currency'])
        invoice.refresh_from_db()
        invoice.save()  # any later edit must not restate it

        assert invoice.currency == 'EUR'

    def test_the_pdf_uses_the_invoices_currency(self, euro_user):
        invoice = InvoiceFactory(user=euro_user, client=ClientFactory(user=euro_user))
        euro_user.currency = 'USD'
        euro_user.save(update_fields=['currency'])

        context = build_pdf_context(invoice)

        assert context['currency_code'] == 'EUR'
        assert context['currency_symbol'] == '€'

    def test_the_email_uses_the_invoices_currency(self, euro_user, mailoutbox):
        client = ClientFactory(user=euro_user)
        invoice = InvoiceFactory(user=euro_user, client=client, status='draft')
        InvoiceItem.objects.create(invoice=invoice, description='Work', quantity=1, unit_price=Decimal('120.00'))
        invoice.save()
        euro_user.currency = 'USD'
        euro_user.save(update_fields=['currency'])

        with patch('apps.invoices.utils.generate_pdf', return_value=b'PDF'):
            from apps.invoices.tasks import send_invoice

            send_invoice(str(invoice.id))

        assert '€120.00' in mailoutbox[0].body

    def test_the_api_reports_the_invoices_currency(self, api_client, user, client_obj):
        user.currency = 'GBP'
        user.save(update_fields=['currency'])
        invoice = InvoiceFactory(user=user, client=client_obj)

        detail = api_client.get(f'/api/invoices/{invoice.id}/').data
        listed = api_client.get('/api/invoices/').data['results'][0]

        assert detail['currency'] == 'GBP'
        assert listed['currency'] == 'GBP'

    def test_stripe_is_charged_in_the_invoices_currency(self, euro_user, settings):
        settings.STRIPE_SECRET_KEY = 'sk_test_123'
        invoice = InvoiceFactory(user=euro_user, client=ClientFactory(user=euro_user), status='sent')
        euro_user.currency = 'USD'
        euro_user.save(update_fields=['currency'])

        with patch('apps.payments.services.stripe') as stripe_mock:
            stripe_mock.checkout.Session.create.return_value = {'id': 'cs', 'url': 'https://pay', 'status': 'open'}
            stripe_mock.error.StripeError = Exception
            from apps.payments.services import payment_link

            payment_link(invoice)

        line_item = stripe_mock.checkout.Session.create.call_args.kwargs['line_items'][0]
        assert line_item['price_data']['currency'] == 'eur'
