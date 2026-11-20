from datetime import timedelta
from unittest.mock import patch

from django.utils import timezone

import pytest
from rest_framework.test import APIClient

from apps.invoices.tasks import send_invoice, send_reminder
from apps.payments.services import record_payment

from .factories import ClientFactory, InvoiceFactory, InvoiceItemFactory, UserFactory


def kinds(invoice):
    return list(invoice.events.values_list('kind', flat=True))


@pytest.fixture
def filled(user, client_obj):
    invoice = InvoiceFactory(user=user, client=client_obj)
    InvoiceItemFactory(invoice=invoice, quantity=1, unit_price=100)
    invoice.save()
    return invoice


@pytest.mark.django_db
class TestTimeline:
    def test_creating_an_invoice_logs_it_once(self, filled):
        assert kinds(filled) == ['created']
        filled.save()  # a later save is not a second creation
        assert kinds(filled) == ['created']

    def test_sending_logs_after_the_email_left_not_before(self, filled):
        with patch('apps.invoices.utils.generate_pdf', return_value=b'PDF'):
            send_invoice(str(filled.id))
        assert kinds(filled) == ['created', 'sent']

    def test_a_failed_email_leaves_no_sent_event(self, filled):
        with (
            patch('apps.invoices.utils.generate_pdf', return_value=b'PDF'),
            patch('apps.invoices.tasks.EmailMessage.send', side_effect=OSError('smtp down')),
            pytest.raises(OSError),
        ):
            send_invoice(str(filled.id))
        assert 'sent' not in kinds(filled)

    def test_reminders_payments_and_settlement_are_logged(self, filled):
        filled.mark_as_sent()
        send_reminder(str(filled.id))
        record_payment(filled, 40)
        record_payment(filled, 60)

        assert kinds(filled) == ['created', 'reminder', 'payment', 'payment', 'paid']

    def test_overdue_and_cancel_are_logged(self, filled):
        filled.mark_as_sent()
        filled.mark_as_overdue()
        filled.cancel()
        assert kinds(filled) == ['created', 'overdue', 'cancelled']

    def test_the_detail_endpoint_returns_the_activity_oldest_first(self, api_client, filled):
        filled.mark_as_sent()
        record_payment(filled, 10)

        response = api_client.get(f'/api/invoices/{filled.id}/')

        assert [e['kind'] for e in response.data['activity']] == ['created', 'payment']

    def test_another_users_timeline_is_not_reachable(self, filled):
        stranger = APIClient()
        stranger.force_authenticate(user=UserFactory())

        assert stranger.get(f'/api/invoices/{filled.id}/').status_code == 404


@pytest.mark.django_db
class TestViewed:
    def test_the_client_opening_the_page_is_logged_once_an_hour(self, filled):
        filled.mark_as_sent()
        anon = APIClient()

        anon.get(f'/api/public/invoices/{filled.public_token}/')
        anon.get(f'/api/public/invoices/{filled.public_token}/')
        assert kinds(filled).count('viewed') == 1

        filled.events.filter(kind='viewed').update(created_at=timezone.now() - timedelta(hours=2))
        anon.get(f'/api/public/invoices/{filled.public_token}/')
        assert kinds(filled).count('viewed') == 2
