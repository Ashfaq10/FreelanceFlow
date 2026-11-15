"""Emails show the user's currency, never a hardcoded dollar sign (BUG-5)."""
from decimal import Decimal
from unittest.mock import patch

import pytest

from apps.invoices.models import InvoiceItem
from apps.invoices.tasks import send_due_soon_email, send_invoice, send_overdue_reminder

from .factories import InvoiceFactory, UserFactory


@pytest.fixture
def euro_invoice(db):
    user = UserFactory(currency='EUR')
    invoice = InvoiceFactory(user=user, status='sent')
    InvoiceItem.objects.create(invoice=invoice, description='Work', quantity=1, unit_price=Decimal('120.00'))
    invoice.save()
    return invoice


def sent_body(mailoutbox):
    assert mailoutbox, 'no email was sent'
    return mailoutbox[-1].body


@pytest.mark.django_db
def test_invoice_email_uses_the_users_currency(euro_invoice, mailoutbox):
    with patch('apps.invoices.utils.generate_pdf', return_value=b'PDF'):
        send_invoice(str(euro_invoice.id))

    body = sent_body(mailoutbox)
    assert '€120.00' in body
    assert '$120.00' not in body


@pytest.mark.django_db
def test_overdue_reminder_uses_the_users_currency(euro_invoice, mailoutbox):
    send_overdue_reminder(str(euro_invoice.id))

    assert '€120.00' in sent_body(mailoutbox)


@pytest.mark.django_db
def test_due_soon_reminder_uses_the_users_currency(euro_invoice, mailoutbox):
    send_due_soon_email(euro_invoice)

    assert '€120.00' in sent_body(mailoutbox)
