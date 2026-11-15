"""Clients with invoices are archived, never deleted (DATA-1)."""
import pytest

from apps.clients.models import Client
from apps.invoices.models import Invoice
from apps.time_tracker.models import TimeLog

from .factories import ClientFactory, InvoiceFactory, TimeLogFactory, UserFactory


@pytest.mark.django_db
class TestClientDelete:
    def test_client_without_invoices_can_be_deleted(self, api_client, client_obj):
        response = api_client.delete(f'/api/clients/{client_obj.id}/')

        assert response.status_code == 204
        assert not Client.objects.filter(id=client_obj.id).exists()

    def test_client_with_invoices_returns_409_and_keeps_everything(self, api_client, user, client_obj):
        invoice = InvoiceFactory(user=user, client=client_obj, status='paid')

        response = api_client.delete(f'/api/clients/{client_obj.id}/')

        assert response.status_code == 409
        assert 'error' in response.data
        assert Client.objects.filter(id=client_obj.id).exists()
        assert Invoice.objects.filter(id=invoice.id).exists()

    def test_client_with_time_logs_returns_409(self, api_client, user, client_obj):
        time_log = TimeLogFactory(user=user, client=client_obj)

        response = api_client.delete(f'/api/clients/{client_obj.id}/')

        assert response.status_code == 409
        assert TimeLog.objects.filter(id=time_log.id).exists()

    def test_archiving_is_the_way_out(self, api_client, user, client_obj):
        InvoiceFactory(user=user, client=client_obj)

        response = api_client.patch(f'/api/clients/{client_obj.id}/', {'is_archived': True}, format='json')

        assert response.status_code == 200
        client_obj.refresh_from_db()
        assert client_obj.is_archived is True

    def test_another_users_client_is_not_deletable(self, api_client):
        someone_elses = ClientFactory(user=UserFactory())

        assert api_client.delete(f'/api/clients/{someone_elses.id}/').status_code == 404


@pytest.mark.django_db
class TestClientList:
    def test_list_hides_archived_clients_by_default(self, api_client, user):
        ClientFactory(user=user, name='Active', is_archived=False)
        ClientFactory(user=user, name='Archived', is_archived=True)

        response = api_client.get('/api/clients/')

        assert [c['name'] for c in response.data['results']] == ['Active']

    def test_archived_filter_returns_the_archived_ones(self, api_client, user):
        ClientFactory(user=user, name='Active', is_archived=False)
        ClientFactory(user=user, name='Archived', is_archived=True)

        response = api_client.get('/api/clients/?archived=true')

        assert [c['name'] for c in response.data['results']] == ['Archived']
