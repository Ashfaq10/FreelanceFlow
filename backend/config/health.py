from django.db import connection
from django.http import JsonResponse

from .celery import broker_reachable


def healthz(request):
    """Liveness plus the two dependencies a request needs: the database and the Celery broker."""
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        database = True
    except Exception:  # any driver error means "down"; the probe must not 500
        database = False
    broker = broker_reachable()
    return JsonResponse(
        {'database': database, 'broker': broker},
        status=200 if database and broker else 503,
    )
