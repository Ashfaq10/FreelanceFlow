import pytest
from decimal import Decimal
from django.urls import reverse
from django.utils import timezone

from apps.invoices.models import Invoice, InvoiceItem
from .factories import InvoiceFactory, InvoiceItemFactory, ClientFactory


@pytest.mark.django_db
class TestInvoiceModel:
    def test_invoice_number_generation(self, user, client_obj):
        invoice = Invoice.objects.create(
            user=user,
            client=client_obj,
            due_date=timezone.now().date() + timezone.timedelta(days=30)
        )
        year = timezone.now().year
        assert invoice.invoice_number.startswith(f'INV-{year}')

    def test_invoice_number_increments(self, user, client_obj):
        invoice1 = Invoice.objects.create(
            user=user,
            client=client_obj,
            due_date=timezone.now().date() + timezone.timedelta(days=30)
        )
        invoice2 = Invoice.objects.create(
            user=user,
            client=client_obj,
            due_date=timezone.now().date() + timezone.timedelta(days=30)
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
        invoice.due_date = timezone.now().date() - timezone.timedelta(days=1)
        invoice.save()
        
        assert invoice.is_overdue is True

    def test_is_not_overdue_when_paid(self, invoice):
        invoice.status = 'paid'
        invoice.due_date = timezone.now().date() - timezone.timedelta(days=1)
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
        invoice.mark_as_paid()
        
        assert invoice.status == 'paid'


@pytest.mark.django_db
class TestInvoiceViews:
    def test_invoice_list_view(self, authenticated_client, invoice):
        response = authenticated_client.get(reverse('invoices:list'))
        
        assert response.status_code == 200
        assert invoice.invoice_number in response.content.decode()

    def test_invoice_list_filters_by_status(self, authenticated_client, user, client_obj):
        draft_invoice = InvoiceFactory(user=user, client=client_obj, status='draft')
        sent_invoice = InvoiceFactory(user=user, client=client_obj, status='sent')
        
        response = authenticated_client.get(reverse('invoices:list') + '?status=draft')
        content = response.content.decode()
        
        assert draft_invoice.invoice_number in content
        assert sent_invoice.invoice_number not in content

    def test_invoice_detail_view(self, authenticated_client, invoice):
        response = authenticated_client.get(
            reverse('invoices:detail', kwargs={'pk': invoice.pk})
        )
        
        assert response.status_code == 200
        assert invoice.invoice_number in response.content.decode()

    def test_invoice_create_view(self, authenticated_client, client_obj):
        response = authenticated_client.get(reverse('invoices:create'))
        
        assert response.status_code == 200

    def test_invoice_create_post(self, authenticated_client, user, client_obj):
        data = {
            'client': client_obj.pk,
            'issue_date': timezone.now().date(),
            'due_date': timezone.now().date() + timezone.timedelta(days=30),
            'tax_rate': 0,
            'notes': 'Test invoice',
            'items-TOTAL_FORMS': 1,
            'items-INITIAL_FORMS': 0,
            'items-MIN_NUM_FORMS': 1,
            'items-MAX_NUM_FORMS': 1000,
            'items-0-description': 'Test service',
            'items-0-quantity': 1,
            'items-0-unit_price': 100,
        }
        
        response = authenticated_client.post(reverse('invoices:create'), data)
        
        assert Invoice.objects.filter(user=user).count() == 1

    def test_invoice_edit_not_allowed_after_sent(self, authenticated_client, invoice):
        invoice.status = 'sent'
        invoice.save()
        
        response = authenticated_client.get(
            reverse('invoices:edit', kwargs={'pk': invoice.pk})
        )
        
        assert response.status_code == 302

    def test_invoice_duplicate(self, authenticated_client, invoice, user):
        InvoiceItemFactory(invoice=invoice)
        
        response = authenticated_client.get(
            reverse('invoices:duplicate', kwargs={'pk': invoice.pk})
        )
        
        assert Invoice.objects.filter(user=user).count() == 2


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
