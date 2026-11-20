from rest_framework import permissions, viewsets

from .models import RecurringInvoice
from .serializers import RecurringInvoiceSerializer


class RecurringInvoiceViewSet(viewsets.ModelViewSet):
    """Schedules belong to their creator; deleting one keeps the invoices it already made."""

    serializer_class = RecurringInvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # schema generation has no user
            return RecurringInvoice.objects.none()
        return (
            RecurringInvoice.objects.filter(user=self.request.user).select_related('client').prefetch_related('items')
        )
