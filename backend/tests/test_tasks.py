import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.utils import timezone

from apps.invoices.models import Invoice
from apps.invoices.tasks import check_overdue_invoices, send_due_soon_reminders, send_invoice
from .factories import InvoiceFactory, InvoiceItemFactory


@pytest.mark.django_db
class TestCheckOverdueInvoices:
    def test_marks_overdue_invoices(self, user, client_obj):
        overdue_invoice = InvoiceFactory(
            user=user,
            client=client_obj,
            status='sent',
            due_date=timezone.now() - timezone.timedelta(days=1)
        )
        
        not_overdue = InvoiceFactory(
            user=user,
            client=client_obj,
            status='sent',
            due_date=timezone.now() + timezone.timedelta(days=1)
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
            due_date=timezone.now() - timezone.timedelta(days=1)
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
            due_date=timezone.now() + timezone.timedelta(days=3)
        )
        
        not_due_soon = InvoiceFactory(
            user=user,
            client=client_obj,
            status='sent',
            due_date=timezone.now() + timezone.timedelta(days=10)
        )
        
        with patch('apps.invoices.tasks.send_due_soon_email') as mock_email:
            result = send_due_soon_reminders()
        
        assert mock_email.call_count == 1
        assert '1 due-soon reminders sent' in result


@pytest.mark.django_db
class TestSendInvoice:
    @patch('apps.invoices.tasks.EmailMessage')
    def test_marks_sent_then_stores_and_attaches_the_pdf(self, mock_email_class, invoice):
        InvoiceItemFactory(invoice=invoice)
        invoice.save()
        mock_email = MagicMock()
        mock_email_class.return_value = mock_email

        # tasks.py imports generate_pdf inside the function, so patch it where it is defined.
        with patch('apps.invoices.utils.generate_pdf') as mock_pdf:
            mock_pdf.return_value = b'PDF content'
            send_invoice(str(invoice.id))

        mock_email.send.assert_called_once()
        mock_email.attach.assert_called_once()
        invoice.refresh_from_db()
        assert invoice.status == 'sent'
        assert invoice.pdf_file  # rendered after the status change, so it is not a DRAFT copy

    def test_handles_missing_invoice(self):
        assert 'not found' in send_invoice('00000000-0000-0000-0000-000000000000')
