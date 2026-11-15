from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.invoices.models import Invoice

from .services import PAYABLE_STATUSES, CheckoutUnavailable, payment_link


class InvoiceCheckoutView(APIView):
    """Pay link for one of your own invoices (PAY-2)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            invoice = Invoice.objects.select_related('user').get(pk=pk, user=request.user)
        except Invoice.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if invoice.status not in PAYABLE_STATUSES:
            return Response(
                {'error': 'Only sent or overdue invoices can be paid.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            url = payment_link(invoice)
        except CheckoutUnavailable as exc:
            return Response({'error': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response({'url': url})
