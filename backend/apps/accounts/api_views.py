import logging

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import EmailMessage
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from PIL import Image
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from config.schema import (
    DeleteAccountSerializer,
    LoginSerializer,
    LogoUploadSerializer,
    MessageSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetSerializer,
    SessionSerializer,
    SignupSerializer,
    VerifyEmailSerializer,
)

from .erasure import erase_account
from .export import export_account
from .models import User
from .serializers import UserSerializer
from .verification import send_verification_email, user_for_token

logger = logging.getLogger(__name__)

ALLOWED_LOGO_FORMATS = {'PNG', 'JPEG', 'WEBP'}


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class SignupRateThrottle(AnonRateThrottle):
    scope = 'signup'


class VerifyEmailThrottle(UserRateThrottle):
    scope = 'verify_email'


class DeleteAccountThrottle(UserRateThrottle):
    scope = 'delete_account'


@extend_schema(
    request=LoginSerializer,
    responses={200: SessionSerializer, 400: MessageSerializer, 401: MessageSerializer},
    auth=[],
)
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response({'message': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, email=email.strip().lower(), password=password)

    if user is None:
        return Response({'message': 'Invalid email or password'}, status=status.HTTP_401_UNAUTHORIZED)

    login(request, user)  # session cookie (SEC-5); also rotates the CSRF token

    return Response({'user': UserSerializer(user, context={'request': request}).data})


@extend_schema(request=SignupSerializer, responses={201: SessionSerializer, 400: MessageSerializer}, auth=[])
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([SignupRateThrottle])
def signup_view(request):
    email = (request.data.get('email') or '').strip().lower()
    password1 = request.data.get('password1')
    password2 = request.data.get('password2')

    if not email or not password1 or not password2:
        return Response({'message': 'Email and passwords are required'}, status=status.HTTP_400_BAD_REQUEST)

    if password1 != password2:
        return Response({'message': 'Passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_password(password1)
    except DjangoValidationError as exc:
        return Response({'message': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Savepoint: without it the IntegrityError poisons an outer transaction.
        with transaction.atomic():
            user = User.objects.create_user(email=email, password=password1)
    except IntegrityError:
        # Two signups for the same address can race past an exists() check.
        return Response({'message': 'A user with this email already exists'}, status=status.HTTP_400_BAD_REQUEST)

    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    send_verification_email(user)

    return Response({'user': UserSerializer(user).data}, status=status.HTTP_201_CREATED)


@extend_schema(request=None, responses=MessageSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({'message': 'Logged out successfully'})


@extend_schema(methods=['GET'], responses=UserSerializer)
@extend_schema(methods=['PATCH'], request=UserSerializer, responses=UserSerializer)
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_view(request):
    if request.method == 'GET':
        # The SPA calls this on every load; make sure it holds a CSRF cookie to echo back on writes.
        get_token(request)
        return Response(UserSerializer(request.user, context={'request': request}).data)

    serializer = UserSerializer(
        request.user,
        data=request.data,
        partial=True,
        context={'request': request},
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request={'multipart/form-data': LogoUploadSerializer}, responses={200: UserSerializer, 400: MessageSerializer}
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_logo_view(request):
    logo_file = request.FILES.get('logo')
    if not logo_file:
        return Response(
            {'message': 'No logo file provided'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if logo_file.size > 2 * 1024 * 1024:
        return Response(
            {'message': 'Logo must be smaller than 2MB'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Pillow decodes the file: the client-sent content type says nothing (an SVG with a script,
    # or HTML named .png, would otherwise be stored and served from /media) — SEC-3.
    try:
        image = Image.open(logo_file)
        image.verify()
    except Exception:
        return Response(
            {'message': 'File must be a valid PNG, JPEG or WebP image.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if image.format not in ALLOWED_LOGO_FORMATS:
        return Response(
            {'message': f'Logo must be one of: {", ".join(sorted(ALLOWED_LOGO_FORMATS))}.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    logo_file.seek(0)
    user = request.user
    previous_logo = user.logo.name if user.logo else ''
    user.logo = logo_file
    user.save(update_fields=['logo'])
    if previous_logo and previous_logo != user.logo.name:
        user.logo.storage.delete(previous_logo)

    serializer = UserSerializer(user, context={'request': request})
    return Response(serializer.data)


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = 'password_reset'


@extend_schema(request=PasswordResetSerializer, responses=MessageSerializer, auth=[])
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def password_reset_view(request):
    email = (request.data.get('email') or '').strip().lower()

    if not email:
        return Response({'message': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email=email, is_active=True).first()
    if user is not None:
        reset_link = (
            f'{settings.FRONTEND_URL.rstrip("/")}/reset-password/'
            f'{urlsafe_base64_encode(force_bytes(user.pk))}/{default_token_generator.make_token(user)}'
        )
        message = render_to_string('accounts/email/password_reset.html', {'user': user, 'reset_link': reset_link})
        email_message = EmailMessage(
            subject='Reset your FreelanceFlow password',
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        email_message.content_subtype = 'html'
        try:
            email_message.send()
        except Exception:  # an SMTP failure must look the same as an unknown address
            logger.exception('Could not send the password reset email')

    # Same answer either way: the response must not reveal whether an account exists.
    return Response({'message': 'If that email has an account, a reset link is on its way.'})


@extend_schema(
    request=PasswordResetConfirmSerializer, responses={200: MessageSerializer, 400: MessageSerializer}, auth=[]
)
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def password_reset_confirm_view(request):
    uid = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('new_password')

    if not uid or not token or not new_password:
        return Response({'message': 'uid, token and new_password are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(pk=urlsafe_base64_decode(uid).decode())
    except (User.DoesNotExist, ValueError, TypeError, DjangoValidationError):
        return Response({'message': 'This reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({'message': 'This reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_password(new_password, user)
    except DjangoValidationError as exc:
        return Response({'message': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=['password'])  # also ends every other session: Django ties them to the password hash

    return Response({'message': 'Password updated. You can sign in now.'})


@extend_schema(request=VerifyEmailSerializer, responses={200: MessageSerializer, 400: MessageSerializer}, auth=[])
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email_view(request):
    user = user_for_token(str(request.data.get('token') or ''))
    if user is None:
        return Response({'message': 'This link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)
    if not user.email_verified:
        user.email_verified = True
        user.save(update_fields=['email_verified'])
    return Response({'message': 'Email confirmed.'})


@extend_schema(request=None, responses=MessageSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([VerifyEmailThrottle])
def resend_verification_view(request):
    if not request.user.email_verified:
        send_verification_email(request.user)
    return Response({'message': 'If your email is not confirmed yet, a new link is on its way.'})


@extend_schema(responses={(200, 'application/json'): OpenApiTypes.OBJECT})
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_view(request):
    response = JsonResponse(export_account(request.user), json_dumps_params={'indent': 2})
    response['Content-Disposition'] = 'attachment; filename="freelanceflow-export.json"'
    return response


@extend_schema(request=DeleteAccountSerializer, responses={200: MessageSerializer, 400: MessageSerializer})
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([DeleteAccountThrottle])
def delete_account_view(request):
    if not request.user.check_password(str(request.data.get('password') or '')):
        return Response({'message': 'That password is not right.'}, status=status.HTTP_400_BAD_REQUEST)
    erase_account(request.user)
    logout(request)
    return Response({'message': 'Your account has been deleted.'})
