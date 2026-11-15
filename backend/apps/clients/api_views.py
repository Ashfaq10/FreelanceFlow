from django.db.models import ProtectedError, Q

from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .models import Client, with_totals
from .serializers import ClientSerializer


class ClientListCreateView(generics.ListCreateAPIView):
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        archived = self.request.query_params.get('archived') == 'true'
        queryset = with_totals(Client.objects.filter(user=self.request.user, is_archived=archived))

        search = (self.request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(company__icontains=search) | Q(email__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return with_totals(Client.objects.filter(user=self.request.user))

    def destroy(self, request, *args, **kwargs):
        client = self.get_object()
        if client.time_logs.exists():
            # Billable history is a record too; archive keeps it (DATA-1).
            return Response(
                {'error': 'This client has time logs. Archive it instead of deleting it.'},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'error': 'This client has invoices. Archive it instead of deleting it.'},
                status=status.HTTP_409_CONFLICT,
            )
