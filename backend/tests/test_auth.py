"""Signup and login hardening (SEC-4)."""
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User

from .factories import UserFactory


@pytest.fixture
def anon():
    return APIClient()


@pytest.mark.django_db
class TestSignup:
    def test_weak_password_is_rejected(self, anon):
        response = anon.post(
            '/api/auth/signup/',
            {'email': 'new@example.com', 'password1': 'password', 'password2': 'password'},
            format='json',
        )

        assert response.status_code == 400
        assert not User.objects.filter(email='new@example.com').exists()

    def test_numeric_password_is_rejected(self, anon):
        response = anon.post(
            '/api/auth/signup/',
            {'email': 'new@example.com', 'password1': '84736251', 'password2': '84736251'},
            format='json',
        )

        assert response.status_code == 400

    def test_strong_password_is_accepted(self, anon):
        response = anon.post(
            '/api/auth/signup/',
            {'email': 'New@Example.com', 'password1': 'tr0ubled-gardener', 'password2': 'tr0ubled-gardener'},
            format='json',
        )

        assert response.status_code == 201
        # Stored lower-case so Bob@x.com and bob@x.com cannot become two accounts.
        assert User.objects.filter(email='new@example.com').exists()

    def test_duplicate_email_in_another_case_is_rejected(self, anon):
        UserFactory(email='taken@example.com')

        response = anon.post(
            '/api/auth/signup/',
            {'email': 'TAKEN@example.com', 'password1': 'tr0ubled-gardener', 'password2': 'tr0ubled-gardener'},
            format='json',
        )

        assert response.status_code == 400
        assert User.objects.filter(email='taken@example.com').count() == 1


@pytest.mark.django_db
class TestLogin:
    def test_login_is_case_insensitive_on_email(self, anon):
        UserFactory(email='person@example.com', password='tr0ubled-gardener')

        response = anon.post(
            '/api/auth/login/',
            {'email': 'Person@Example.com', 'password': 'tr0ubled-gardener'},
            format='json',
        )

        assert response.status_code == 200
        assert 'token' in response.data

    def test_repeated_failures_are_throttled(self, anon, settings):
        settings.REST_FRAMEWORK = {**settings.REST_FRAMEWORK}
        UserFactory(email='person@example.com', password='tr0ubled-gardener')

        statuses = [
            anon.post(
                '/api/auth/login/', {'email': 'person@example.com', 'password': 'wrong'}, format='json'
            ).status_code
            for _ in range(11)
        ]

        assert 429 in statuses
