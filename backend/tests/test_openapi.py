"""docs/openapi.json is generated from the API and must not drift (OPS-7).

When this fails after an intentional API change, regenerate it:
    python manage.py spectacular --format openapi-json --file ../docs/openapi.json --settings=config.settings.test
"""

from pathlib import Path

import pytest
from django.core.management import call_command

COMMITTED = Path(__file__).resolve().parents[2] / 'docs' / 'openapi.json'


def generate(tmp_path):
    out = tmp_path / 'openapi.json'
    call_command('spectacular', format='openapi-json', file=str(out), validate=True, fail_on_warn=True)
    return out.read_text(encoding='utf-8').replace('\r\n', '\n')


def test_schema_generates_without_warnings(tmp_path):
    assert generate(tmp_path)  # validate + fail_on_warn raise otherwise


def test_committed_schema_is_current(tmp_path):
    committed = COMMITTED.read_text(encoding='utf-8').replace('\r\n', '\n')

    assert generate(tmp_path) == committed, 'docs/openapi.json is stale; see the module docstring'


@pytest.mark.django_db
def test_schema_endpoint_is_served(client):
    response = client.get('/api/schema/', HTTP_ACCEPT='application/vnd.oai.openapi+json')

    assert response.status_code == 200
    assert '/api/invoices/' in response.content.decode()
