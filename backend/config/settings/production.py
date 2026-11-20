"""
Production settings for FreelanceFlow.
"""
from .base import *
from config.observability import init_sentry

# No defaults: booting with the repo's published SECRET_KEY would let anyone forge sessions and reset tokens.
SECRET_KEY = os.environ['SECRET_KEY']
ALLOWED_HOSTS = [host.strip() for host in os.environ['ALLOWED_HOSTS'].split(',') if host.strip()]

DEBUG = False

# One proxy (Caddy) sits in front: trust exactly its X-Forwarded-For hop for throttling.
REST_FRAMEWORK = {**REST_FRAMEWORK, 'NUM_PROXIES': 1}
# Throttle counters must be shared by all gunicorn workers, or every limit is multiplied by the worker count.
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    }
}

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_SSL_REDIRECT = True
# TLS terminates at the proxy; without this Django sees http:// and SECURE_SSL_REDIRECT loops.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
# Container health probes hit gunicorn over plain http; a redirect would read as unhealthy.
SECURE_REDIRECT_EXEMPT = [r'^healthz/$']
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME', 'freelanceflow-pdfs')
AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'us-east-1')
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None
# Private bucket: no AWS_S3_CUSTOM_DOMAIN (it turns signing off); object URLs carry a one-hour signature (SEC-6).
AWS_QUERYSTRING_AUTH = True
AWS_QUERYSTRING_EXPIRE = 3600
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
}

STORAGES = {**STORAGES, 'default': {'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage'}}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {'()': 'config.observability.JsonFormatter'},
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        # WeasyPrint and fontTools narrate every PDF at INFO; that drowns the real log lines.
        'weasyprint': {'level': 'WARNING'},
        'fontTools': {'level': 'WARNING'},
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
    },
}

init_sentry()  # settings load in gunicorn and in the Celery worker alike
