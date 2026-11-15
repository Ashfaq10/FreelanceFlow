"""The SPA is the only UI, so the old server-rendered routes are gone (LEAN-1)."""

import pytest
from django.urls import reverse


def test_the_stripe_webhook_lives_under_api():
    assert reverse('payments:webhook') == '/api/payments/webhook/'


@pytest.mark.django_db
@pytest.mark.parametrize('path', ['/', '/invoices/', '/clients/', '/time/', '/settings/', '/accounts/login/'])
def test_dead_server_rendered_pages_are_not_routed(client, path):
    # They used to answer 500: the templates they rendered never existed.
    assert client.get(path).status_code == 404
