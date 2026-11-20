import csv
import io

import pytest
from rest_framework.test import APIClient

from apps.payments.models import Payment

from .factories import ClientFactory, InvoiceFactory, InvoiceItemFactory, PaymentFactory, TimeLogFactory, UserFactory


def read(response):
    return list(csv.reader(io.StringIO(response.content.decode())))


@pytest.fixture
def paid_invoice(user, client_obj):
    invoice = InvoiceFactory(user=user, client=client_obj)
    InvoiceItemFactory(invoice=invoice, quantity=1, unit_price=100)
    invoice.save()
    return invoice


@pytest.mark.django_db
class TestExports:
    def test_invoices_csv_has_balance_and_only_my_rows(self, api_client, paid_invoice):
        PaymentFactory(invoice=paid_invoice, amount_paid='40.00')
        InvoiceFactory(user=UserFactory(), client=ClientFactory())

        response = api_client.get('/api/exports/invoices/')
        rows = read(response)

        assert response['Content-Type'].startswith('text/csv')
        assert 'attachment' in response['Content-Disposition']
        assert [r[0] for r in rows[1:]] == [paid_invoice.invoice_number]
        header = rows[0]
        assert rows[1][header.index('Total')] == '100.00'
        assert rows[1][header.index('Paid')] == '40.00'
        assert rows[1][header.index('Balance due')] == '60.00'

    def test_a_cell_that_looks_like_a_formula_is_defused(self, api_client, user):
        ClientFactory(user=user)  # unrelated row
        client = ClientFactory(user=user, name='=HYPERLINK("http://evil")')
        InvoiceFactory(user=user, client=client)

        rows = read(api_client.get('/api/exports/invoices/'))

        assert any(row[1] == '\'=HYPERLINK("http://evil")' for row in rows[1:])

    def test_refunds_stay_numbers_not_defused_text(self, api_client, paid_invoice):
        PaymentFactory(invoice=paid_invoice, amount_paid='-25.00', method='stripe')

        rows = read(api_client.get('/api/exports/payments/'))

        assert rows[1][rows[0].index('Amount')] == '-25.00'

    def test_payments_and_time_logs_are_scoped_to_the_caller(self, api_client, user, paid_invoice):
        PaymentFactory(invoice=paid_invoice)
        foreign = InvoiceFactory(user=UserFactory(), client=ClientFactory())
        PaymentFactory(invoice=foreign)
        TimeLogFactory(user=user, client=paid_invoice.client, description='mine')
        TimeLogFactory(description='theirs')

        payments = read(api_client.get('/api/exports/payments/'))
        logs = read(api_client.get('/api/exports/time-logs/'))

        assert len(payments) == 2 and Payment.objects.count() == 2
        assert [r[2] for r in logs[1:]] == ['mine']

    def test_anonymous_callers_are_refused(self):
        assert APIClient().get('/api/exports/invoices/').status_code == 401
