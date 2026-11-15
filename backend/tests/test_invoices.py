import pytest
from decimal import Decimal
from django.utils import timezone

from apps.invoices.models import Invoice, InvoiceItem
from .factories import InvoiceFactory


@pytest.mark.django_db
class TestInvoiceModel:
    def test_invoice_number_generation(self, user, client_obj):
        invoice = Invoice.objects.create(
            user=user,
            client=client_obj,
            due_date=timezone.now() + timezone.timedelta(days=30)
        )
        year = timezone.now().year
        assert invoice.invoice_number.startswith(f'INV-{year}')

    def test_invoice_number_increments(self, user, client_obj):
        invoice1 = Invoice.objects.create(
            user=user,
            client=client_obj,
            due_date=timezone.now() + timezone.timedelta(days=30)
        )
        invoice2 = Invoice.objects.create(
            user=user,
            client=client_obj,
            due_date=timezone.now() + timezone.timedelta(days=30)
        )
        
        num1 = int(invoice1.invoice_number.split('-')[-1])
        num2 = int(invoice2.invoice_number.split('-')[-1])
        assert num2 == num1 + 1

    def test_calculate_totals(self, invoice):
        InvoiceItem.objects.create(
            invoice=invoice,
            description='Service 1',
            quantity=2,
            unit_price=Decimal('100.00')
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            description='Service 2',
            quantity=1,
            unit_price=Decimal('150.00')
        )
        
        invoice.calculate_totals()
        
        assert invoice.subtotal == Decimal('350.00')
        assert invoice.total == Decimal('350.00')

    def test_calculate_totals_with_tax(self, invoice):
        invoice.tax_rate = Decimal('10.00')
        invoice.save()
        
        InvoiceItem.objects.create(
            invoice=invoice,
            description='Service',
            quantity=1,
            unit_price=Decimal('100.00')
        )
        
        invoice.calculate_totals()
        
        assert invoice.subtotal == Decimal('100.00')
        assert invoice.tax_amount == Decimal('10.00')
        assert invoice.total == Decimal('110.00')

    def test_is_overdue(self, invoice):
        invoice.status = 'sent'
        invoice.due_date = timezone.now() - timezone.timedelta(days=1)
        invoice.save()
        
        assert invoice.is_overdue is True

    def test_is_not_overdue_when_paid(self, invoice):
        invoice.status = 'paid'
        invoice.due_date = timezone.now() - timezone.timedelta(days=1)
        invoice.save()
        
        assert invoice.is_overdue is False

    def test_is_editable(self, invoice):
        assert invoice.is_editable is True
        
        invoice.status = 'sent'
        invoice.save()
        
        assert invoice.is_editable is False

    def test_mark_as_sent(self, invoice):
        invoice.mark_as_sent()
        
        assert invoice.status == 'sent'
        assert invoice.sent_at is not None

    def test_mark_as_paid(self, invoice):
        # Only sent or overdue invoices can be paid (DATA-2); transitions are covered in test_transitions.py.
        invoice.mark_as_sent()

        invoice.mark_as_paid()

        assert invoice.status == 'paid'


@pytest.mark.django_db
class TestInvoiceAPI:
    def test_invoice_list_api(self, api_client, invoice):
        response = api_client.get('/api/invoices/')
        
        assert response.status_code == 200
        assert len(response.data['results']) == 1

    def test_invoice_detail_api(self, api_client, invoice):
        response = api_client.get(f'/api/invoices/{invoice.pk}/')
        
        assert response.status_code == 200
        assert response.data['invoice_number'] == invoice.invoice_number

    def test_invoice_list_filter_by_status(self, api_client, user, client_obj):
        InvoiceFactory(user=user, client=client_obj, status='draft')
        InvoiceFactory(user=user, client=client_obj, status='sent')
        
        response = api_client.get('/api/invoices/?status=draft')
        
        assert response.status_code == 200
        assert len(response.data['results']) == 1
