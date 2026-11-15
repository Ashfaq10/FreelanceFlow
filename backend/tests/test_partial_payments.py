"""Invoices can take a deposit and instalments (PAY-3)."""

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.invoices.models import InvoiceItem
from apps.payments.models import Payment

from .factories import InvoiceFactory, UserFactory


@pytest.fixture
def sent_invoice(db, user, client_obj):
    invoice = InvoiceFactory(user=user, client=client_obj, status='sent')
    InvoiceItem.objects.create(invoice=invoice, description='Work', quantity=1, unit_price=Decimal('500.00'))
    invoice.save()
    return invoice


def record(api_client, invoice, amount, **extra):
    return api_client.post(f'/api/invoices/{invoice.id}/payments/', {'amount': str(amount), **extra}, format='json')


@pytest.mark.django_db
class TestRecordingPayments:
    def test_a_deposit_leaves_the_invoice_unpaid(self, api_client, sent_invoice):
        response = record(api_client, sent_invoice, '200.00')

        assert response.status_code == 201
        assert response.data['amount_paid'] == '200.00'
        assert response.data['amount_due'] == '300.00'
        sent_invoice.refresh_from_db()
        assert sent_invoice.status == 'sent'

    def test_the_final_instalment_settles_the_invoice(self, api_client, sent_invoice):
        record(api_client, sent_invoice, '200.00')
        record(api_client, sent_invoice, '150.00')

        response = record(api_client, sent_invoice, '150.00')

        assert response.data['amount_due'] == '0.00'
        sent_invoice.refresh_from_db()
        assert sent_invoice.status == 'paid'
        assert sent_invoice.payments.count() == 3

    def test_overpaying_is_refused(self, api_client, sent_invoice):
        response = record(api_client, sent_invoice, '500.01')

        assert response.status_code == 400
        assert sent_invoice.payments.count() == 0

    def test_a_second_payment_cannot_exceed_the_balance(self, api_client, sent_invoice):
        record(api_client, sent_invoice, '400.00')

        response = record(api_client, sent_invoice, '150.00')

        assert response.status_code == 400
        assert sent_invoice.amount_due == Decimal('100.00')

    def test_zero_is_refused(self, api_client, sent_invoice):
        assert record(api_client, sent_invoice, '0.00').status_code == 400

    def test_method_and_notes_are_stored(self, api_client, sent_invoice):
        record(api_client, sent_invoice, '500.00', method='bank', notes='Wire ref 12345')

        payment = sent_invoice.payments.get()
        assert payment.method == 'bank'
        assert payment.notes == 'Wire ref 12345'

    def test_another_users_invoice_is_not_found(self, sent_invoice):
        other = APIClient()
        other.force_authenticate(user=UserFactory())

        assert record(other, sent_invoice, '10.00').status_code == 404


@pytest.mark.django_db
class TestMarkPaidWithADeposit:
    def test_mark_paid_settles_only_the_remainder(self, api_client, sent_invoice):
        record(api_client, sent_invoice, '200.00')

        response = api_client.post(f'/api/invoices/{sent_invoice.id}/mark-paid/')

        assert response.status_code == 200
        sent_invoice.refresh_from_db()
        assert sent_invoice.status == 'paid'
        assert sent_invoice.amount_paid == Decimal('500.00')
        assert [p.amount_paid for p in sent_invoice.payments.order_by('created_at')] == [
            Decimal('200.00'),
            Decimal('300.00'),
        ]


@pytest.mark.django_db
class TestDashboardCountsMoneyReceived:
    def test_revenue_and_outstanding_follow_the_payments(self, api_client, sent_invoice):
        record(api_client, sent_invoice, '200.00')

        summary = api_client.get('/api/dashboard/summary/').data

        assert summary['total_revenue'] == '200.00'
        assert summary['outstanding_amount'] == '300.00'

    def test_monthly_revenue_sums_payments(self, api_client, sent_invoice):
        record(api_client, sent_invoice, '200.00')

        months = api_client.get('/api/dashboard/monthly-revenue/').data

        assert months[-1]['total'] == '200.00'


@pytest.mark.django_db
def test_webhook_payment_is_recorded_once(sent_invoice):
    from apps.payments.views import handle_successful_payment

    session = {
        'id': 'cs_test_1',
        'payment_intent': 'pi_1',
        'amount_total': 50000,
        'payment_status': 'paid',
        'metadata': {'invoice_id': str(sent_invoice.id)},
    }

    handle_successful_payment(session)
    handle_successful_payment(session)  # Stripe redelivers

    assert Payment.objects.filter(invoice=sent_invoice).count() == 1
    sent_invoice.refresh_from_db()
    assert sent_invoice.status == 'paid'
