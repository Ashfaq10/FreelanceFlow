"""
Celery configuration for FreelanceFlow project.
"""

import os

from celery import Celery
from celery.schedules import crontab
from kombu.exceptions import OperationalError

# Same default as manage.py; production sets DJANGO_SETTINGS_MODULE explicitly (docker-compose.prod.yml).
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

app = Celery('freelanceflow')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'check-overdue-invoices-daily': {
        'task': 'apps.invoices.tasks.check_overdue_invoices',
        'schedule': crontab(hour=8, minute=0),
    },
    'send-due-soon-reminders-daily': {
        'task': 'apps.invoices.tasks.send_due_soon_reminders',
        'schedule': crontab(hour=8, minute=30),
    },
}


def broker_reachable(timeout=1):
    """False when the broker is down. `delay()` alone retries a dead broker forever (OPS-9)."""
    if app.conf.task_always_eager:
        return True
    try:
        with app.connection_for_write() as connection:
            connection.ensure_connection(max_retries=0, timeout=timeout)
    except OperationalError:
        return False
    return True
