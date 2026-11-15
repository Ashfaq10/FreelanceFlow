from django.contrib.auth import authenticate, login, logout

from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import User
from .serializers import UserSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response({'message': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, email=email, password=password)

    if user is None:
        return Response({'message': 'Invalid email or password'}, status=status.HTTP_401_UNAUTHORIZED)

    token, _ = Token.objects.get_or_create(user=user)

    return Response({'token': token.key, 'user': UserSerializer(user, context={'request': request}).data})


@api_view(['POST'])
@permission_classes([AllowAny])
def signup_view(request):
    email = request.data.get('email')
    password1 = request.data.get('password1')
    password2 = request.data.get('password2')

    if not email or not password1 or not password2:
        return Response({'message': 'Email and passwords are required'}, status=status.HTTP_400_BAD_REQUEST)

    if password1 != password2:
        return Response({'message': 'Passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)

    if len(password1) < 8:
        return Response({'message': 'Password must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({'message': 'A user with this email already exists'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(email=email, password=password1)
    token, _ = Token.objects.get_or_create(user=user)

    return Response({'token': token.key, 'user': UserSerializer(user).data}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        request.user.auth_token.delete()
    except:
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

    if not logo_file.content_type.startswith('image/'):
        return Response(
            {'message': 'File must be an image (PNG, JPG, etc.)'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if logo_file.size > 2 * 1024 * 1024:
        return Response(
            {'message': 'Logo must be smaller than 2MB'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user
    user.logo = logo_file
    user.save(update_fields=['logo'])

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
