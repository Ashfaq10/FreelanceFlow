import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.utils import timezone

from apps.invoices.models import Invoice
from apps.invoices.tasks import (
    check_overdue_invoices,
    send_due_soon_reminders,
    send_invoice_email,
    generate_and_store_pdf,
)
from .factories import InvoiceFactory, InvoiceItemFactory


@pytest.mark.django_db
class TestCheckOverdueInvoices:
    def test_marks_overdue_invoices(self, user, client_obj):
        overdue_invoice = InvoiceFactory(
            user=user,
            client=client_obj,
            status='sent',
            due_date=timezone.now().date() - timezone.timedelta(days=1)
        )
        
        not_overdue = InvoiceFactory(
            user=user,
            client=client_obj,
            status='sent',
            due_date=timezone.now().date() + timezone.timedelta(days=1)
        )
        
        with patch('apps.invoices.tasks.send_overdue_reminder') as mock_reminder:
            mock_reminder.delay = MagicMock()
            result = check_overdue_invoices()
        
        overdue_invoice.refresh_from_db()
        not_overdue.refresh_from_db()
        
        assert overdue_invoice.status == 'overdue'
        assert not_overdue.status == 'sent'
        assert '1 invoices marked as overdue' in result

    def test_does_not_mark_paid_as_overdue(self, user, client_obj):
        paid_invoice = InvoiceFactory(
            user=user,
            client=client_obj,
            status='paid',
            due_date=timezone.now().date() - timezone.timedelta(days=1)
        )
        
        with patch('apps.invoices.tasks.send_overdue_reminder'):
            check_overdue_invoices()
        
        paid_invoice.refresh_from_db()
        assert paid_invoice.status == 'paid'


@pytest.mark.django_db
class TestSendDueSoonReminders:
    def test_sends_reminders_for_due_soon(self, user, client_obj):
        due_soon = InvoiceFactory(
            user=user,
            client=client_obj,
            status='sent',
            due_date=timezone.now().date() + timezone.timedelta(days=3)
        )
        
        not_due_soon = InvoiceFactory(
            user=user,
            client=client_obj,
            status='sent',
            due_date=timezone.now().date() + timezone.timedelta(days=10)
        )
        
        with patch('apps.invoices.tasks.send_due_soon_email') as mock_email:
            result = send_due_soon_reminders()
        
        assert mock_email.call_count == 1
        assert '1 due-soon reminders sent' in result


@pytest.mark.django_db
class TestSendInvoiceEmail:
    @patch('apps.invoices.tasks.EmailMessage')
    def test_sends_email_with_pdf(self, mock_email_class, invoice):
        InvoiceItemFactory(invoice=invoice)
        
        mock_email = MagicMock()
        mock_email_class.return_value = mock_email
        
        with patch('apps.invoices.tasks.generate_pdf') as mock_pdf:
            mock_pdf.return_value = b'PDF content'
            result = send_invoice_email(str(invoice.id))
        
        mock_email.send.assert_called_once()
        mock_email.attach.assert_called_once()
        
        invoice.refresh_from_db()
        assert invoice.status == 'sent'

    def test_handles_missing_invoice(self):
        result = send_invoice_email('00000000-0000-0000-0000-000000000000')
        assert 'not found' in result


@pytest.mark.django_db
class TestGenerateAndStorePDF:
    def test_generates_and_stores_pdf(self, invoice):
        InvoiceItemFactory(invoice=invoice)
        
        with patch('apps.invoices.tasks.generate_pdf') as mock_pdf:
            mock_pdf.return_value = b'PDF content'
            result = generate_and_store_pdf(str(invoice.id))
        
        invoice.refresh_from_db()
        assert invoice.pdf_file is not None or 'PDF generated' in result

    def test_handles_missing_invoice(self):
        result = generate_and_store_pdf('00000000-0000-0000-0000-000000000000')
        assert 'not found' in result
