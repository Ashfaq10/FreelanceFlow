import pytest
from django.test import Client

from .factories import UserFactory, ClientFactory, InvoiceFactory


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def client_obj(db, user):
    return ClientFactory(user=user)


@pytest.fixture
def invoice(db, user, client_obj):
    return InvoiceFactory(user=user, client=client_obj)


@pytest.fixture
def authenticated_client(db, user):
    client = Client()
    client.force_login(user)
    return client


@pytest.fixture
def api_client(db, user):
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=user)
    return client
