"""Tracked hours become invoice lines (FEAT-1)."""

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.invoices.models import Invoice, InvoiceItem
from apps.time_tracker.models import TimeLog

from .factories import ClientFactory, InvoiceFactory, UserFactory


@pytest.fixture
def log(db, user, client_obj):
    def make(hours='2.00', rate='100.00', client=None, description='Design work', **extra):
        return TimeLog.objects.create(
            user=user,
            client=client or client_obj,
            description=description,
            hours=Decimal(hours),
            hourly_rate=None if rate is None else Decimal(rate),
            **extra,
        )

    return make


def bill(api_client, logs, invoice=None):
    payload = {'time_logs': [str(entry.id) for entry in logs]}
    if invoice:
        payload['invoice'] = str(invoice.id)
    return api_client.post('/api/time-logs/bill/', payload, format='json')


@pytest.mark.django_db
class TestBillingNewInvoice:
    def test_creates_a_draft_with_one_line_per_log(self, api_client, log, client_obj):
        first = log(hours='2.00', rate='100.00', description='Design work')
        second = log(hours='1.50', rate='80.00', description='Revisions')

        response = bill(api_client, [first, second])

        assert response.status_code == 201
        assert response.data['status'] == 'draft'
        assert response.data['client'] == client_obj.id
        assert response.data['total'] == '320.00'  # 2 × 100 + 1.5 × 80
        assert len(response.data['items']) == 2

    def test_marks_the_logs_billed_and_links_them(self, api_client, log):
        entry = log()

        response = bill(api_client, [entry])

        entry.refresh_from_db()
        assert entry.is_billed is True
        assert str(entry.invoice_id) == response.data['id']

    def test_the_line_names_the_work_and_its_date(self, api_client, log):
        entry = log(description='Logo sketches')

        response = bill(api_client, [entry])

        assert response.data['items'][0]['description'].startswith('Logo sketches (')

    def test_billing_twice_is_refused(self, api_client, log):
        entry = log()
        bill(api_client, [entry])

        response = bill(api_client, [entry])

        assert response.status_code == 400
        assert 'already billed' in response.data['error']
        assert Invoice.objects.count() == 1

    def test_logs_for_two_clients_cannot_share_an_invoice(self, api_client, log, user):
        other_client = ClientFactory(user=user)

        response = bill(api_client, [log(), log(client=other_client)])

        assert response.status_code == 400
        assert Invoice.objects.count() == 0

    def test_a_log_without_a_rate_cannot_be_billed(self, api_client, log):
        response = bill(api_client, [log(rate=None)])

        assert response.status_code == 400
        assert 'hourly rate' in response.data['error']
        assert Invoice.objects.count() == 0

    def test_another_users_log_is_not_found(self, log):
        entry = log()
        other = APIClient()
        other.force_authenticate(user=UserFactory())

        assert bill(other, [entry]).status_code == 404


@pytest.mark.django_db
class TestBillingOntoAnExistingInvoice:
    def test_appends_to_a_draft_and_keeps_its_items(self, api_client, log, user, client_obj):
        invoice = InvoiceFactory(user=user, client=client_obj)
        InvoiceItem.objects.create(invoice=invoice, description='Retainer', quantity=1, unit_price=Decimal('50.00'))
        invoice.save()

        response = bill(api_client, [log(hours='2.00', rate='100.00')], invoice=invoice)

        assert response.status_code == 201
        assert len(response.data['items']) == 2
        assert response.data['total'] == '250.00'

    def test_a_sent_invoice_is_refused(self, api_client, log, user, client_obj):
        invoice = InvoiceFactory(user=user, client=client_obj, status='sent')

        response = bill(api_client, [log()], invoice=invoice)

        assert response.status_code == 400
        assert 'draft' in response.data['error']

    def test_a_different_clients_invoice_is_refused(self, api_client, log, user):
        invoice = InvoiceFactory(user=user, client=ClientFactory(user=user))

        response = bill(api_client, [log()], invoice=invoice)

        assert response.status_code == 400
        assert 'different client' in response.data['error']
