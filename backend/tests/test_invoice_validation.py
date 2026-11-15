"""Amount validation on invoice writes (DATA-5)."""
from decimal import Decimal

import pytest

from apps.invoices.models import Invoice


def payload(client_obj, **overrides):
    data = {
        'client': str(client_obj.id),
        'items': [{'description': 'Work', 'quantity': 1, 'rate': '10.00'}],
    }
    data.update(overrides)
    return data


@pytest.mark.django_db
class TestQuantity:
    def test_fractional_quantity_is_accepted(self, api_client, client_obj):
        response = api_client.post(
            '/api/invoices/',
            payload(client_obj, items=[{'description': 'Consulting', 'quantity': '2.5', 'rate': '100.00'}]),
            format='json',
        )

        assert response.status_code == 201
        invoice = Invoice.objects.get(id=response.data['id'])
        assert invoice.items.first().quantity == Decimal('2.5')
        assert invoice.total == Decimal('250.00')

    def test_half_hour_quantity_is_accepted(self, api_client, client_obj):
        response = api_client.post(
            '/api/invoices/',
            payload(client_obj, items=[{'description': 'Support', 'quantity': '0.5', 'rate': '80.00'}]),
            format='json',
        )

        assert response.status_code == 201
        assert Invoice.objects.get(id=response.data['id']).total == Decimal('40.00')

    def test_zero_quantity_is_rejected(self, api_client, client_obj):
        response = api_client.post(
            '/api/invoices/',
            payload(client_obj, items=[{'description': 'Work', 'quantity': '0', 'rate': '10.00'}]),
            format='json',
        )

        assert response.status_code == 400

    def test_negative_rate_is_rejected(self, api_client, client_obj):
        response = api_client.post(
            '/api/invoices/',
            payload(client_obj, items=[{'description': 'Work', 'quantity': '1', 'rate': '-5.00'}]),
            format='json',
        )

        assert response.status_code == 400


@pytest.mark.django_db
class TestDiscountAndTax:
    def test_negative_discount_is_rejected(self, api_client, client_obj):
        response = api_client.post('/api/invoices/', payload(client_obj, discount_amount='-50'), format='json')

        assert response.status_code == 400
        assert 'discount_amount' in response.data

    def test_discount_above_subtotal_is_rejected(self, api_client, client_obj):
        response = api_client.post('/api/invoices/', payload(client_obj, discount_amount='99.00'), format='json')

        assert response.status_code == 400
        assert 'discount_amount' in response.data

    def test_negative_tax_rate_is_rejected(self, api_client, client_obj):
        response = api_client.post('/api/invoices/', payload(client_obj, tax_rate='-10'), format='json')

        assert response.status_code == 400
        assert 'tax_rate' in response.data

    def test_tax_rate_above_100_is_rejected(self, api_client, client_obj):
        response = api_client.post('/api/invoices/', payload(client_obj, tax_rate='150'), format='json')

        assert response.status_code == 400
        assert 'tax_rate' in response.data

    def test_discount_equal_to_subtotal_is_allowed(self, api_client, client_obj):
        response = api_client.post('/api/invoices/', payload(client_obj, discount_amount='10.00'), format='json')

        assert response.status_code == 201
        assert Invoice.objects.get(id=response.data['id']).total == Decimal('0.00')
