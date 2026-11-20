"""
Settings for the Playwright smoke test (TEST-5): the test settings (eager Celery, in-memory mail, temp media)
on a throwaway SQLite file, because runserver's threads cannot share an in-memory database.
"""
from .test import *  # noqa: F401,F403

DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'e2e.sqlite3'}}  # noqa: F405

# No network call to Stripe: a missing key makes pay-link creation fail fast and the send continues.
STRIPE_SECRET_KEY = ''

# The smoke test cannot read the verification mail; the gate itself is covered by backend tests.
EMAIL_VERIFICATION_REQUIRED = False

# Tracebacks for 500s show up in the CI log instead of a bare "500 145".
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'loggers': {'django.request': {'handlers': ['console'], 'level': 'ERROR'}},
}
