"""A refused mail server must not swallow the email (OPS-9)."""

import smtplib
from decimal import Decimal
from unittest.mock import patch

import pytest

from apps.invoices.models import InvoiceItem
from apps.invoices.tasks import send_invoice

from .factories import InvoiceFactory


@pytest.fixture
def ready_invoice(db, user, client_obj):
    invoice = InvoiceFactory(user=user, client=client_obj)
    InvoiceItem.objects.create(invoice=invoice, description='Work', quantity=1, unit_price=Decimal('10.00'))
    invoice.save()
    return invoice


@pytest.mark.django_db
class TestEmailFailuresAreRetried:
    def test_a_refused_mail_server_raises_instead_of_reporting_success(self, ready_invoice):
        with patch('apps.invoices.utils.generate_pdf', return_value=b'PDF'), patch(
            'apps.invoices.tasks.EmailMessage'
        ) as email_class:
            email_class.return_value.send.side_effect = smtplib.SMTPServerDisconnected('closed')

            with pytest.raises(smtplib.SMTPServerDisconnected):
                send_invoice(str(ready_invoice.id))

    def test_the_invoice_is_still_sent_so_the_retry_does_not_start_over(self, ready_invoice):
        with patch('apps.invoices.utils.generate_pdf', return_value=b'PDF'), patch(
            'apps.invoices.tasks.EmailMessage'
        ) as email_class:
            email_class.return_value.send.side_effect = smtplib.SMTPServerDisconnected('closed')

            with pytest.raises(smtplib.SMTPServerDisconnected):
                send_invoice(str(ready_invoice.id))

        ready_invoice.refresh_from_db()
        assert ready_invoice.status == 'sent'
