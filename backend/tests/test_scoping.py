"""Cross-tenant tests: a write must never accept another user's related object (SEC-1)."""
import pytest
from rest_framework.test import APIClient

from apps.invoices.models import Invoice
from apps.time_tracker.models import TimeLog

from .factories import ClientFactory, InvoiceFactory, UserFactory


@pytest.fixture
def other_client(db):
    """A client belonging to someone else."""
    return ClientFactory(user=UserFactory())


@pytest.mark.django_db
class TestInvoiceWriteScoping:
    def test_create_rejects_another_users_client(self, api_client, other_client):
        response = api_client.post(
            '/api/invoices/',
            {'client': str(other_client.id), 'items': [{'description': 'Work', 'quantity': 1, 'rate': 10}]},
            format='json',
        )

        assert response.status_code == 400
        assert 'client' in response.data
        assert not Invoice.objects.filter(client=other_client).exists()

    def test_create_accepts_own_client(self, api_client, client_obj):
        response = api_client.post(
            '/api/invoices/',
            {'client': str(client_obj.id), 'items': [{'description': 'Work', 'quantity': 1, 'rate': 10}]},
            format='json',
        )

        assert response.status_code == 201

    def test_update_rejects_another_users_client(self, api_client, invoice, other_client):
        response = api_client.put(
            f'/api/invoices/{invoice.id}/',
            {'client': str(other_client.id), 'items': [{'description': 'Work', 'quantity': 1, 'rate': 10}]},
            format='json',
        )

        assert response.status_code == 400
        invoice.refresh_from_db()
        assert invoice.client != other_client


@pytest.mark.django_db
class TestTimeLogScoping:
    def test_create_rejects_another_users_client(self, api_client, other_client):
        response = api_client.post(
            '/api/time-logs/',
            # hourly_rate is required today (BUG-3 covers making it optional).
            {'client': str(other_client.id), 'description': 'Work', 'date': '2026-11-15', 'hours': 2, 'hourly_rate': 50},
            format='json',
        )

        assert response.status_code == 400
        assert 'client' in response.data
        assert not TimeLog.objects.filter(client=other_client).exists()

    def test_create_rejects_another_users_invoice(self, api_client, client_obj):
        others_invoice = InvoiceFactory()

        response = api_client.post(
            '/api/time-logs/',
            {
                'client': str(client_obj.id),
                'invoice': str(others_invoice.id),
                'description': 'Work',
                'date': '2026-11-15',
                'hours': 2,
                'hourly_rate': 50,
            },
            format='json',
        )

        assert response.status_code == 400
        assert 'invoice' in response.data

    def test_create_accepts_own_client(self, api_client, client_obj):
        response = api_client.post(
            '/api/time-logs/',
            {'client': str(client_obj.id), 'description': 'Work', 'date': '2026-11-15', 'hours': 2, 'hourly_rate': 50},
            format='json',
        )

        assert response.status_code == 201


@pytest.mark.django_db
def test_other_users_invoice_is_not_readable(invoice):
    """The detail view scopes by user; an unscoped lookup would leak the client's contact details."""
    outsider = APIClient()
    outsider.force_authenticate(user=UserFactory())

    assert outsider.get(f'/api/invoices/{invoice.id}/').status_code == 404
