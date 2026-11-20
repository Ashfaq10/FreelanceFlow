import json
import logging
import os

import sentry_sdk
from sentry_sdk.scrubber import DEFAULT_DENYLIST, EventScrubber

# Attributes every LogRecord has; anything else arrived through `extra=` and belongs in the JSON line.
_STANDARD = set(vars(logging.makeLogRecord({}))) | {'message', 'asctime'}


class JsonFormatter(logging.Formatter):
    """One JSON object per line, so a log shipper can index `invoice_id` and friends without regexes."""

    def format(self, record):
        entry = {
            'time': self.formatTime(record, '%Y-%m-%dT%H:%M:%S%z'),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }
        entry.update({key: value for key, value in vars(record).items() if key not in _STANDARD})
        if record.exc_info:
            entry['exception'] = self.formatException(record.exc_info)
        return json.dumps(entry, default=str)


def init_sentry():
    """No DSN, no Sentry. The Django and Celery integrations switch on by themselves once the packages exist."""
    dsn = os.getenv('SENTRY_DSN')
    if dsn:
        sentry_sdk.init(
            dsn=dsn,
            environment=os.getenv('SENTRY_ENVIRONMENT', 'production'),
            release=os.getenv('SENTRY_RELEASE'),
            traces_sample_rate=float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0')),
            send_default_pii=False,  # invoices hold client names and amounts; keep them out of events
            # The default denylist knows `password`, not our field names, or the public tokens in request bodies.
            event_scrubber=EventScrubber(denylist=DEFAULT_DENYLIST + ['password1', 'password2', 'new_password', 'token']),
        )
