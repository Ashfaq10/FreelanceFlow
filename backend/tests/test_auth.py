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
        assert 'token' not in response.data
        assert anon.get('/api/auth/user/').data['email'] == 'person@example.com'

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


@pytest.mark.django_db
class TestSession:
    def test_signup_signs_the_user_in(self, anon):
        response = anon.post(
            '/api/auth/signup/',
            {'email': 'new@example.com', 'password1': 'tr0ubled-gardener', 'password2': 'tr0ubled-gardener'},
            format='json',
        )

        assert response.status_code == 201
        assert anon.get('/api/auth/user/').data['email'] == 'new@example.com'

    def test_logout_ends_the_session(self, anon):
        UserFactory(email='person@example.com', password='tr0ubled-gardener')
        anon.post('/api/auth/login/', {'email': 'person@example.com', 'password': 'tr0ubled-gardener'}, format='json')

        assert anon.post('/api/auth/logout/').status_code == 200
        assert anon.get('/api/auth/user/').status_code == 401

    def test_a_logged_in_write_without_the_csrf_header_is_refused(self):
        UserFactory(email='person@example.com', password='tr0ubled-gardener')
        browser = APIClient(enforce_csrf_checks=True)
        # Login is the one call that needs no token; it hands the browser its CSRF cookie.
        login = browser.post(
            '/api/auth/login/', {'email': 'person@example.com', 'password': 'tr0ubled-gardener'}, format='json'
        )
        csrf = login.cookies['csrftoken'].value

        refused = browser.patch('/api/auth/user/', {'business_name': 'X'}, format='json')
        allowed = browser.patch('/api/auth/user/', {'business_name': 'X'}, format='json', HTTP_X_CSRFTOKEN=csrf)

        assert refused.status_code == 403
        assert allowed.status_code == 200
