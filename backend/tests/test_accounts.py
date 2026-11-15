"""Account endpoints: upload validation and profile fields (SEC-3, SEC-8)."""
import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image


def png_bytes(size=(10, 10)):
    buffer = io.BytesIO()
    Image.new('RGB', size, 'blue').save(buffer, format='PNG')
    return buffer.getvalue()


@pytest.mark.django_db
class TestLogoUpload:
    def test_a_real_png_is_accepted(self, api_client, user):
        upload = SimpleUploadedFile('logo.png', png_bytes(), content_type='image/png')

        response = api_client.post('/api/auth/logo/', {'logo': upload}, format='multipart')

        assert response.status_code == 200
        user.refresh_from_db()
        assert user.logo

    def test_html_disguised_as_png_is_rejected(self, api_client, user):
        upload = SimpleUploadedFile(
            'evil.png', b'<html><script>alert(1)</script></html>', content_type='image/png'
        )

        response = api_client.post('/api/auth/logo/', {'logo': upload}, format='multipart')

        assert response.status_code == 400
        user.refresh_from_db()
        assert not user.logo

    def test_svg_is_rejected(self, api_client, user):
        upload = SimpleUploadedFile(
            'logo.svg', b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
            content_type='image/svg+xml',
        )

        response = api_client.post('/api/auth/logo/', {'logo': upload}, format='multipart')

        assert response.status_code == 400

    def test_replacing_a_logo_removes_the_previous_file(self, api_client, user):
        api_client.post(
            '/api/auth/logo/',
            {'logo': SimpleUploadedFile('first.png', png_bytes(), content_type='image/png')},
            format='multipart',
        )
        user.refresh_from_db()
        first_path = user.logo.name
        storage = user.logo.storage

        api_client.post(
            '/api/auth/logo/',
            {'logo': SimpleUploadedFile('second.png', png_bytes((12, 12)), content_type='image/png')},
            format='multipart',
        )

        user.refresh_from_db()
        assert user.logo.name != first_path
        assert not storage.exists(first_path)


@pytest.mark.django_db
class TestProfileCurrency:
    def test_unknown_currency_is_rejected(self, api_client):
        response = api_client.patch('/api/auth/user/', {'default_currency': 'ZZZ'}, format='json')

        assert response.status_code == 400
        assert 'default_currency' in response.data

    def test_known_currency_is_accepted(self, api_client, user):
        response = api_client.patch('/api/auth/user/', {'default_currency': 'EUR'}, format='json')

        assert response.status_code == 200
        user.refresh_from_db()
        assert user.currency == 'EUR'
