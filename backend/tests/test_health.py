from unittest.mock import patch

from django.db import connection


def test_healthy_when_database_and_broker_answer(client, db):
    response = client.get('/healthz/')

    assert response.status_code == 200
    assert response.json() == {'database': True, 'broker': True}


def test_503_when_the_broker_is_down(client, db):
    with patch('config.health.broker_reachable', return_value=False):
        response = client.get('/healthz/')

    assert response.status_code == 503
    assert response.json() == {'database': True, 'broker': False}


def test_503_when_the_database_is_down(client, db):
    with patch.object(connection, 'cursor', side_effect=RuntimeError('down')):
        response = client.get('/healthz/')

    assert response.status_code == 503
    assert response.json()['database'] is False
