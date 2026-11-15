"""Time logs and client totals as the SPA expects them (BUG-2, BUG-3)."""
from decimal import Decimal

import pytest

from apps.invoices.models import InvoiceItem
from apps.time_tracker.models import TimeLog

from .factories import InvoiceFactory


@pytest.mark.django_db
class TestOptionalHourlyRate:
    def test_time_log_saves_without_a_rate(self, api_client, client_obj):
        response = api_client.post(
            '/api/time-logs/',
            {'client': str(client_obj.id), 'description': 'Fixed-price work', 'date': '2026-11-15', 'hours': '2.00'},
            format='json',
        )

        assert response.status_code == 201
        log = TimeLog.objects.get(id=response.data['id'])
        assert log.hourly_rate is None
        assert log.total_amount is None

    def test_time_log_with_a_rate_still_computes_the_amount(self, api_client, client_obj):
        response = api_client.post(
            '/api/time-logs/',
            {
                'client': str(client_obj.id),
                'description': 'Hourly work',
                'date': '2026-11-15',
                'hours': '2.00',
                'hourly_rate': '75.00',
            },
            format='json',
        )

        assert response.status_code == 201
        assert TimeLog.objects.get(id=response.data['id']).total_amount == Decimal('150.00')


@pytest.mark.django_db
class TestClientTotals:
    def test_totals_use_the_names_the_spa_reads(self, api_client, user, client_obj):
        def invoice(status, amount):
            inv = InvoiceFactory(user=user, client=client_obj, status=status)
            InvoiceItem.objects.create(invoice=inv, description='Work', quantity=1, unit_price=Decimal(amount))
            inv.save()
            return inv

        invoice('paid', '100.00')
        invoice('sent', '50.00')
        invoice('overdue', '25.00')
        invoice('draft', '999.00')
        invoice('cancelled', '888.00')

        data = api_client.get(f'/api/clients/{client_obj.id}/').data

        assert data['total_billed'] == Decimal('175.00')  # paid + sent + overdue, no draft or cancelled
        assert data['total_paid'] == Decimal('100.00')
        assert data['outstanding'] == Decimal('75.00')
        assert data['invoice_count'] == 5

    def test_a_client_without_invoices_reports_zero(self, api_client, client_obj):
        data = api_client.get(f'/api/clients/{client_obj.id}/').data

        assert data['total_billed'] == 0
        assert data['total_paid'] == 0
        assert data['outstanding'] == 0
