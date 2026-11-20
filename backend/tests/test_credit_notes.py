from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from apps.dashboard.api_views import _balance
from apps.invoices.models import CreditNote, Invoice
from apps.payments.services import _create_session, record_payment

from .factories import ClientFactory, InvoiceFactory, InvoiceItemFactory, UserFactory


@pytest.fixture
def sent(user, client_obj):
    invoice = InvoiceFactory(user=user, client=client_obj, tax_rate=0, discount_amount=0)
    InvoiceItemFactory(invoice=invoice, quantity=1, unit_price=100)
    invoice.save()
    invoice.mark_as_sent()
    return invoice


def credit(api_client, invoice, amount, reason='Scope reduced'):
    return api_client.post(
        f'/api/invoices/{invoice.id}/credit-notes/', {'amount': amount, 'reason': reason}, format='json'
    )


@pytest.mark.django_db
class TestCreditNotes:
    def test_a_credit_lowers_the_balance_but_not_the_total(self, api_client, sent):
        response = credit(api_client, sent, '30.00')

        assert response.status_code == 201
        assert response.data['number'].startswith('CN-') and response.data['number'].endswith('-001')
        sent.refresh_from_db()
        assert (sent.total, sent.amount_credited, sent.amount_due) == (100, 30, 70)
        assert sent.events.filter(kind='credit').count() == 1

    def test_numbers_count_up_per_user(self, api_client, sent):
        credit(api_client, sent, '10')
        second = credit(api_client, sent, '10')

        assert second.data['number'].endswith('-002')

    def test_more_than_is_due_is_refused(self, api_client, sent):
        record_payment(sent, 80)

        response = credit(api_client, sent, '30.00')

        assert response.status_code == 400
        assert not CreditNote.objects.exists()

    def test_a_reason_is_required(self, api_client, sent):
        assert credit(api_client, sent, '10', reason='  ').status_code == 400

    def test_crediting_everything_of_an_unpaid_invoice_voids_it(self, api_client, sent):
        credit(api_client, sent, '100.00')

        sent.refresh_from_db()
        assert sent.status == 'cancelled'
        assert 'Fully credited' in sent.events.filter(kind='cancelled').get().detail

    def test_crediting_the_rest_after_a_deposit_settles_it_as_paid(self, api_client, sent):
        record_payment(sent, 60)

        credit(api_client, sent, '40.00')

        sent.refresh_from_db()
        assert sent.status == 'paid'

    def test_drafts_and_paid_invoices_cannot_be_credited(self, api_client, user, client_obj, sent):
        draft = InvoiceFactory(user=user, client=client_obj)
        assert credit(api_client, draft, '1').status_code == 400
        record_payment(sent, 100)
        assert credit(api_client, sent, '1').status_code == 400

    def test_another_users_invoice_is_not_found(self, sent):
        stranger = APIClient()
        stranger.force_authenticate(user=UserFactory())

        assert credit(stranger, sent, '10').status_code == 404

    def test_credit_note_pdf_is_scoped_and_renders(self, api_client, sent):
        note_id = credit(api_client, sent, '10').data['id']

        mine = api_client.get(f'/api/credit-notes/{note_id}/pdf/')
        stranger = APIClient()
        stranger.force_authenticate(user=UserFactory())

        assert mine.status_code == 200 and mine.content.startswith(b'%PDF')
        assert stranger.get(f'/api/credit-notes/{note_id}/pdf/').status_code == 404

    def test_cancelling_keeps_the_reason_on_the_timeline(self, api_client, sent):
        api_client.post(f'/api/invoices/{sent.id}/cancel/', {'reason': 'Client dropped the project'}, format='json')

        assert sent.events.filter(kind='cancelled').get().detail == 'Client dropped the project'

    def test_the_dashboard_balance_subtracts_credits(self, api_client, sent):
        credit(api_client, sent, '25.00')

        assert _balance(Invoice.objects.filter(pk=sent.pk)) == 75


@pytest.mark.django_db
class TestStripeAfterBalanceChanges:
    def test_checkout_charges_what_is_still_due(self, api_client, sent):
        credit(api_client, sent, '30.00')
        sent.refresh_from_db()

        with patch('apps.payments.services.stripe.checkout.Session.create') as create:
            _create_session(sent)

        assert create.call_args.kwargs['line_items'][0]['price_data']['unit_amount'] == 7000

    def test_a_credit_or_payment_drops_the_stored_pay_link(self, api_client, sent):
        sent.stripe_session_id, sent.stripe_payment_url = 'cs_1', 'https://pay.example/1'
        sent.save(update_fields=['stripe_session_id', 'stripe_payment_url'])

        credit(api_client, sent, '10')
        sent.refresh_from_db()
        assert (sent.stripe_session_id, sent.stripe_payment_url) == ('', '')

        sent.stripe_session_id, sent.stripe_payment_url = 'cs_2', 'https://pay.example/2'
        sent.save(update_fields=['stripe_session_id', 'stripe_payment_url'])
        record_payment(sent, 10)
        sent.refresh_from_db()
        assert sent.stripe_session_id == ''
