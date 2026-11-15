from django.db.models import ProtectedError

from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .models import Client
from .serializers import ClientSerializer


class ClientListCreateView(generics.ListCreateAPIView):
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        archived = self.request.query_params.get('archived') == 'true'
        return Client.objects.filter(user=self.request.user, is_archived=archived)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Client.objects.filter(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'error': 'This client has invoices. Archive it instead of deleting it.'},
                status=status.HTTP_409_CONFLICT,
            )
