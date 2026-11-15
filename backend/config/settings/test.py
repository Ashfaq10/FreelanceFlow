"""
Test settings for FreelanceFlow (pytest.ini points here).

SQLite in memory unless TEST_DATABASE_URL is set (CI sets it to Postgres).
"""
import os

import dj_database_url

from .base import *  # noqa: F401,F403

# Not DATABASE_URL: the root .env sets that for Postgres, and local test runs must not need a database server.
if os.getenv('TEST_DATABASE_URL'):
    DATABASES = {'default': dj_database_url.parse(os.environ['TEST_DATABASE_URL'])}
else:
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}

PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
