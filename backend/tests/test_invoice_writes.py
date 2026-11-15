"""Invoice create/update is one transaction and recomputes totals once (DATA-4)."""
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.db import DatabaseError

from apps.invoices.models import Invoice, InvoiceItem


@pytest.mark.django_db
class TestInvoiceWritesAreAtomic:
    def test_create_leaves_nothing_behind_when_items_fail(self, api_client, user, client_obj):
        with patch.object(InvoiceItem.objects, 'bulk_create', side_effect=DatabaseError('boom')):
            with pytest.raises(DatabaseError):
                api_client.post(
                    '/api/invoices/',
                    {'client': str(client_obj.id), 'items': [{'description': 'Work', 'quantity': 1, 'rate': 10}]},
                    format='json',
                )

        assert not Invoice.objects.filter(user=user).exists()

    def test_update_keeps_the_old_items_when_the_new_ones_fail(self, api_client, invoice):
        InvoiceItem.objects.create(invoice=invoice, description='Original', quantity=1, unit_price=Decimal('10.00'))

        with patch.object(InvoiceItem.objects, 'bulk_create', side_effect=DatabaseError('boom')):
            with pytest.raises(DatabaseError):
                api_client.put(
                    f'/api/invoices/{invoice.id}/',
                    {
                        'client': str(invoice.client_id),
                        'items': [{'description': 'Replacement', 'quantity': 2, 'rate': 20}],
                    },
                    format='json',
                )

        assert [item.description for item in invoice.items.all()] == ['Original']


@pytest.mark.django_db
class TestTotalsAfterWrites:
    def test_create_stores_totals(self, api_client, client_obj):
        response = api_client.post(
            '/api/invoices/',
            {
                'client': str(client_obj.id),
                'tax_rate': '10.00',
                'items': [
                    {'description': 'Design', 'quantity': 2, 'rate': '50.00'},
                    {'description': 'Hosting', 'quantity': 1, 'rate': '25.50'},
                ],
            },
            format='json',
        )

        assert response.status_code == 201
        invoice = Invoice.objects.get(id=response.data['id'])
        assert invoice.subtotal == Decimal('125.50')
        assert invoice.tax_amount == Decimal('12.55')
        assert invoice.total == Decimal('138.05')
        assert invoice.items.count() == 2

    def test_update_replaces_items_and_recomputes(self, api_client, invoice):
        InvoiceItem.objects.create(invoice=invoice, description='Old', quantity=1, unit_price=Decimal('10.00'))

        response = api_client.put(
            f'/api/invoices/{invoice.id}/',
            {
                'client': str(invoice.client_id),
                'items': [{'description': 'New', 'quantity': 3, 'rate': '7.00'}],
            },
            format='json',
        )

        assert response.status_code == 200
        invoice.refresh_from_db()
        assert invoice.items.count() == 1
        assert invoice.subtotal == Decimal('21.00')
        assert invoice.total == Decimal('21.00')
