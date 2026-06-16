"""
Celery configuration for FreelanceFlow project.
"""
import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

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


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
