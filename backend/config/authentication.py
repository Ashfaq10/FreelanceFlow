from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework.authentication import SessionAuthentication


class SessionAuthentication401(SessionAuthentication):
    """Session cookie auth that answers 401, not 403, when nobody is signed in.

    DRF picks the status from the first authenticator's challenge header, and the stock class has none.
    The SPA treats 401 as "session ended" and 403 as "not allowed" (CSRF failures stay 403).
    """

    def authenticate_header(self, request):
        return 'Session'


class SessionAuthentication401Scheme(OpenApiAuthenticationExtension):
    target_class = 'config.authentication.SessionAuthentication401'
    name = 'cookieAuth'

    def get_security_definition(self, auto_schema):
        return {'type': 'apiKey', 'in': 'cookie', 'name': 'sessionid'}
