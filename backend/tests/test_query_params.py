"""Nonsense query params answer 400, not 500 (BUG-17)."""

import pytest

from .factories import InvoiceFactory


@pytest.mark.django_db
class TestInvoiceListParams:
    def test_bad_client_uuid(self, api_client):
        assert api_client.get('/api/invoices/?client=foo').status_code == 400

    def test_unknown_status(self, api_client):
        assert api_client.get('/api/invoices/?status=exploded').status_code == 400

    def test_page_zero(self, api_client):
        assert api_client.get('/api/invoices/?page=0').status_code == 400

    def test_valid_filters_still_work(self, api_client, user, client_obj):
        invoice = InvoiceFactory(user=user, client=client_obj)

        response = api_client.get(f'/api/invoices/?status=draft&client={client_obj.id}')

        assert response.status_code == 200
        assert [row['id'] for row in response.data['results']] == [str(invoice.id)]


@pytest.mark.django_db
class TestMonthlyRevenueParams:
    def test_non_numeric_months(self, api_client):
        assert api_client.get('/api/dashboard/monthly-revenue/?months=abc').status_code == 400

    def test_negative_months(self, api_client):
        assert api_client.get('/api/dashboard/monthly-revenue/?months=-3').status_code == 400

    def test_default_months(self, api_client):
        assert api_client.get('/api/dashboard/monthly-revenue/').status_code == 200
