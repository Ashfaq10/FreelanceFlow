"""Password reset actually resets a password (BUG-6)."""
import re

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User

from .factories import UserFactory

NEW_PASSWORD = 'tr0ubled-gardener'


@pytest.fixture
def anon():
    return APIClient()


def reset_link_parts(mailoutbox):
    assert mailoutbox, 'no reset email was sent'
    match = re.search(r'/reset-password/([^/]+)/([^\s"<]+)', mailoutbox[-1].body)
    assert match, mailoutbox[-1].body
    return match.group(1), match.group(2)


@pytest.mark.django_db
class TestRequestReset:
    def test_known_email_receives_a_link(self, anon, mailoutbox):
        UserFactory(email='person@example.com')

        response = anon.post('/api/auth/password/reset/', {'email': 'Person@Example.com'}, format='json')

        assert response.status_code == 200
        uid, token = reset_link_parts(mailoutbox)
        assert uid and token

    def test_unknown_email_answers_the_same_and_sends_nothing(self, anon, mailoutbox):
        response = anon.post('/api/auth/password/reset/', {'email': 'nobody@example.com'}, format='json')

        assert response.status_code == 200
        assert mailoutbox == []


@pytest.mark.django_db
class TestConfirmReset:
    def test_valid_link_sets_the_new_password(self, anon, mailoutbox):
        user = UserFactory(email='person@example.com')
        Token.objects.create(user=user)
        anon.post('/api/auth/password/reset/', {'email': 'person@example.com'}, format='json')
        uid, token = reset_link_parts(mailoutbox)

        response = anon.post(
            '/api/auth/password/reset/confirm/',
            {'uid': uid, 'token': token, 'new_password': NEW_PASSWORD},
            format='json',
        )

        assert response.status_code == 200
        user.refresh_from_db()
        assert user.check_password(NEW_PASSWORD)
        # Old API tokens must not survive a password reset.
        assert not Token.objects.filter(user=user).exists()

    def test_the_link_cannot_be_used_twice(self, anon, mailoutbox):
        UserFactory(email='person@example.com')
        anon.post('/api/auth/password/reset/', {'email': 'person@example.com'}, format='json')
        uid, token = reset_link_parts(mailoutbox)
        payload = {'uid': uid, 'token': token, 'new_password': NEW_PASSWORD}
        anon.post('/api/auth/password/reset/confirm/', payload, format='json')

        second = anon.post('/api/auth/password/reset/confirm/', payload, format='json')

        assert second.status_code == 400

    def test_a_tampered_token_is_rejected(self, anon, mailoutbox):
        user = UserFactory(email='person@example.com', password='original-pass-9')
        anon.post('/api/auth/password/reset/', {'email': 'person@example.com'}, format='json')
        uid, _ = reset_link_parts(mailoutbox)

        response = anon.post(
            '/api/auth/password/reset/confirm/',
            {'uid': uid, 'token': 'not-a-real-token', 'new_password': NEW_PASSWORD},
            format='json',
        )

        assert response.status_code == 400
        user.refresh_from_db()
        assert user.check_password('original-pass-9')

    def test_a_weak_new_password_is_rejected(self, anon, mailoutbox):
        UserFactory(email='person@example.com')
        anon.post('/api/auth/password/reset/', {'email': 'person@example.com'}, format='json')
        uid, token = reset_link_parts(mailoutbox)

        response = anon.post(
            '/api/auth/password/reset/confirm/',
            {'uid': uid, 'token': token, 'new_password': 'password'},
            format='json',
        )

        assert response.status_code == 400
        assert not User.objects.get(email='person@example.com').check_password('password')
