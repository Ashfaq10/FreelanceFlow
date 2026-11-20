import json
import logging

from config.observability import JsonFormatter, init_sentry


def format_record(**kwargs):
    logger = logging.getLogger('test')
    record = logger.makeRecord('test', logging.INFO, __file__, 1, 'invoice %s sent', ('INV-1',), None, **kwargs)
    return json.loads(JsonFormatter().format(record))


def test_a_log_line_is_one_json_object_with_its_extras():
    entry = format_record(extra={'invoice_id': 'abc'})

    assert entry['message'] == 'invoice INV-1 sent'
    assert entry['level'] == 'INFO'
    assert entry['invoice_id'] == 'abc'


def test_exceptions_are_kept_in_the_line():
    try:
        raise ValueError('boom')
    except ValueError:
        import sys

        record = logging.getLogger('test').makeRecord('test', logging.ERROR, __file__, 1, 'failed', (), sys.exc_info())

    assert 'ValueError: boom' in json.loads(JsonFormatter().format(record))['exception']


def test_sentry_stays_off_without_a_dsn(monkeypatch):
    import sentry_sdk

    monkeypatch.delenv('SENTRY_DSN', raising=False)
    init_sentry()

    assert not sentry_sdk.is_initialized()
