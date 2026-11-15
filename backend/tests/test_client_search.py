"""Client search filters on the server (BUG-11)."""
import pytest

from .factories import ClientFactory


@pytest.mark.django_db
class TestClientSearch:
    @pytest.fixture(autouse=True)
    def clients(self, user):
        ClientFactory(user=user, name='Sarah Mitchell', company='Brightline', email='sarah@brightline.example.com')
        ClientFactory(user=user, name='Daniel Okafor', company='Northwind', email='daniel@northwind.example.com')

    def test_matches_on_name(self, api_client):
        response = api_client.get('/api/clients/?search=sarah')

        assert [c['name'] for c in response.data['results']] == ['Sarah Mitchell']

    def test_matches_on_company(self, api_client):
        response = api_client.get('/api/clients/?search=northwind')

        assert [c['name'] for c in response.data['results']] == ['Daniel Okafor']

    def test_matches_on_email(self, api_client):
        response = api_client.get('/api/clients/?search=BRIGHTLINE.EXAMPLE')

        assert [c['name'] for c in response.data['results']] == ['Sarah Mitchell']

    def test_no_match_returns_an_empty_page(self, api_client):
        response = api_client.get('/api/clients/?search=nobody')

        assert response.data['results'] == []
        assert response.data['count'] == 0

    def test_blank_search_returns_everyone(self, api_client):
        response = api_client.get('/api/clients/?search=')

        assert response.data['count'] == 2
