from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction

from PIL import Image
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .models import User
from .serializers import UserSerializer

ALLOWED_LOGO_FORMATS = {'PNG', 'JPEG', 'WEBP'}


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class SignupRateThrottle(AnonRateThrottle):
    scope = 'signup'


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

    token, _ = Token.objects.get_or_create(user=user)

    return Response({'token': token.key, 'user': UserSerializer(user, context={'request': request}).data})


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

    token, _ = Token.objects.get_or_create(user=user)

    return Response({'token': token.key, 'user': UserSerializer(user).data}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        request.user.auth_token.delete()
    except Token.DoesNotExist:
        pass
    return Response({'message': 'Logged out successfully'})


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_view(request):
    if request.method == 'GET':
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


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_view(request):
    email = request.data.get('email')

    if not email:
        return Response({'message': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    # In production, send an email with reset link
    # For now, just return success
    return Response({'message': 'Password reset email sent'})
