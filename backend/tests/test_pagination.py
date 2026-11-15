"""Clients can ask for more than one page's worth (BUG-7)."""
import pytest

from .factories import ClientFactory


@pytest.mark.django_db
class TestPageSize:
    def test_default_page_is_twenty(self, api_client, user):
        ClientFactory.create_batch(25, user=user)

        response = api_client.get('/api/clients/')

        assert len(response.data['results']) == 20
        assert response.data['count'] == 25
        assert response.data['next']

    def test_page_size_can_be_raised(self, api_client, user):
        ClientFactory.create_batch(25, user=user)

        response = api_client.get('/api/clients/?page_size=100')

        assert len(response.data['results']) == 25
        assert response.data['next'] is None

    def test_page_size_is_capped(self, api_client, user):
        ClientFactory.create_batch(25, user=user)

        response = api_client.get('/api/clients/?page_size=10000')

        assert len(response.data['results']) == 25  # capped at max_page_size, still one page here
        assert response.data['count'] == 25
