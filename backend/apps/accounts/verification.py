import logging

from django.conf import settings
from django.core import signing
from django.core.mail import EmailMessage
from django.template.loader import render_to_string

from .models import User

logger = logging.getLogger(__name__)

SALT = 'freelanceflow.verify-email'
MAX_AGE = 3 * 24 * 3600


def make_token(user):
    """Signed and bound to the address: changing the email (or tampering) invalidates old links."""
    return signing.dumps({'uid': str(user.pk), 'email': user.email}, salt=SALT)


def user_for_token(token):
    """The user a valid, unexpired token names, else None."""
    try:
        data = signing.loads(token, salt=SALT, max_age=MAX_AGE)
    except signing.BadSignature:  # also SignatureExpired
        return None
    return User.objects.filter(pk=data['uid'], email=data['email'], is_active=True).first()


def send_verification_email(user):
    """Never raises: a mail outage must not break signup, and the user can ask for another link."""
    link = f'{settings.FRONTEND_URL.rstrip("/")}/verify-email/{make_token(user)}'
    message = EmailMessage(
        subject='Confirm your FreelanceFlow email',
        body=render_to_string('accounts/email/verify_email.html', {'verify_link': link}),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    message.content_subtype = 'html'
    try:
        message.send()
    except Exception:  # SMTP, DNS, TLS... all mean the same thing here
        logger.exception('Could not send the verification email', extra={'user_id': str(user.pk)})
        return False
    return True
