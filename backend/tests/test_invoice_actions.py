"""Duplicate, re-send and manual reminders (FEAT-2)."""

from decimal import Decimal
from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from apps.invoices.models import Invoice, InvoiceItem

from .factories import InvoiceFactory, UserFactory


@pytest.fixture
def filled_invoice(db, user, client_obj):
    invoice = InvoiceFactory(
        user=user,
        client=client_obj,
        status='sent',
        notes='Net 30',
        tax_rate=Decimal('10.00'),
        discount_amount=Decimal('20.00'),
    )
    InvoiceItem.objects.create(invoice=invoice, description='Work', quantity=2, unit_price=Decimal('100.00'))
    invoice.save()
    return invoice


@pytest.mark.django_db
class TestDuplicate:
    def test_copies_the_lines_and_terms_into_a_new_draft(self, api_client, filled_invoice):
        response = api_client.post(f'/api/invoices/{filled_invoice.id}/duplicate/')

        assert response.status_code == 201
        assert response.data['status'] == 'draft'
        assert response.data['invoice_number'] != filled_invoice.invoice_number
        assert response.data['notes'] == 'Net 30'
        assert response.data['total'] == str(filled_invoice.total)
        assert [item['description'] for item in response.data['items']] == ['Work']

    def test_the_original_is_untouched(self, api_client, filled_invoice):
        api_client.post(f'/api/invoices/{filled_invoice.id}/duplicate/')

        filled_invoice.refresh_from_db()
        assert filled_invoice.status == 'sent'
        assert filled_invoice.items.count() == 1
        assert Invoice.objects.count() == 2

    def test_the_copy_starts_without_payment_state(self, api_client, filled_invoice):
        filled_invoice.stripe_session_id = 'cs_old'
        filled_invoice.stripe_payment_url = 'https://pay'
        filled_invoice.save(update_fields=['stripe_session_id', 'stripe_payment_url'])

        response = api_client.post(f'/api/invoices/{filled_invoice.id}/duplicate/')

        copy = Invoice.objects.get(pk=response.data['id'])
        assert copy.stripe_session_id == ''
        assert copy.stripe_payment_url == ''
        assert copy.sent_at is None

    def test_another_users_invoice_is_not_found(self, filled_invoice):
        other = APIClient()
        other.force_authenticate(user=UserFactory())

        assert other.post(f'/api/invoices/{filled_invoice.id}/duplicate/').status_code == 404


@pytest.mark.django_db
class TestResend:
    def test_an_overdue_invoice_can_be_sent_again(self, api_client, filled_invoice):
        filled_invoice.mark_as_overdue()

        with patch('apps.invoices.api_views.send_invoice.delay') as queued:
            response = api_client.post(f'/api/invoices/{filled_invoice.id}/send/')

        assert response.status_code == 200
        queued.assert_called_once()

    def test_resending_keeps_the_overdue_status(self, filled_invoice):
        filled_invoice.mark_as_overdue()

        with patch('apps.invoices.utils.generate_pdf', return_value=b'PDF'):
            from apps.invoices.tasks import send_invoice

            send_invoice(str(filled_invoice.id))

        filled_invoice.refresh_from_db()
        assert filled_invoice.status == 'overdue'

    def test_a_paid_invoice_cannot_be_sent(self, api_client, filled_invoice):
        filled_invoice.mark_as_paid()

        assert api_client.post(f'/api/invoices/{filled_invoice.id}/send/').status_code == 400


@pytest.mark.django_db
class TestReminder:
    def test_queues_a_reminder_for_a_sent_invoice(self, api_client, filled_invoice):
        with patch('apps.invoices.api_views.send_reminder.delay') as queued:
            response = api_client.post(f'/api/invoices/{filled_invoice.id}/remind/')

        assert response.status_code == 200
        queued.assert_called_once_with(str(filled_invoice.id))

    def test_a_draft_cannot_be_chased(self, api_client, invoice):
        assert api_client.post(f'/api/invoices/{invoice.id}/remind/').status_code == 400

    def test_an_overdue_invoice_gets_the_overdue_wording(self, filled_invoice, mailoutbox):
        filled_invoice.mark_as_overdue()

        from apps.invoices.tasks import send_reminder

        send_reminder(str(filled_invoice.id))

        assert 'Overdue' in mailoutbox[0].subject

    def test_a_sent_invoice_gets_the_due_soon_wording(self, filled_invoice, mailoutbox):
        from apps.invoices.tasks import send_reminder

        send_reminder(str(filled_invoice.id))

        assert 'Overdue' not in mailoutbox[0].subject
        assert filled_invoice.invoice_number in mailoutbox[0].subject
