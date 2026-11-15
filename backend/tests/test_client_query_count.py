"""The client list costs the same number of queries however many clients there are (PERF-1)."""

from decimal import Decimal

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.invoices.models import InvoiceItem

from .factories import ClientFactory, InvoiceFactory


def add_clients(user, how_many):
    for _ in range(how_many):
        client = ClientFactory(user=user)
        for status in ('sent', 'paid'):
            invoice = InvoiceFactory(user=user, client=client, status=status)
            InvoiceItem.objects.create(invoice=invoice, description='Work', quantity=1, unit_price=Decimal('10.00'))
            invoice.save()


def queries_for_list(api_client):
    with CaptureQueriesContext(connection) as queries:
        response = api_client.get('/api/clients/')
    assert response.status_code == 200
    return len(queries), response


@pytest.mark.django_db
def test_query_count_does_not_grow_with_the_number_of_clients(api_client, user):
    add_clients(user, 2)
    few, _ = queries_for_list(api_client)

    add_clients(user, 12)
    many, response = queries_for_list(api_client)

    assert many == few
    assert len(response.data['results']) == 14


@pytest.mark.django_db
def test_totals_are_still_right_per_client(api_client, user):
    add_clients(user, 1)

    row = api_client.get('/api/clients/').data['results'][0]

    assert row['invoice_count'] == 2
    assert row['total_billed'] == Decimal('20.00')
    assert row['total_paid'] == Decimal('10.00')
    assert row['outstanding'] == Decimal('10.00')


@pytest.mark.django_db
def test_a_new_client_reports_zero_totals(api_client):
    response = api_client.post(
        '/api/clients/', {'name': 'Fresh Client', 'email': 'fresh@example.com'}, format='json'
    )

    assert response.status_code == 201
    assert response.data['invoice_count'] == 0
    assert response.data['total_billed'] == Decimal('0')
