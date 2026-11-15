from django.core.exceptions import ValidationError

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.invoices.models import Invoice
from apps.invoices.serializers import InvoiceDetailSerializer

from .serializers import PaymentSerializer
from .services import PAYABLE_STATUSES, CheckoutUnavailable, payment_link, record_payment


def invoice_detail(invoice, request):
    """The same payload the invoice detail endpoint returns, with payments refreshed."""
    invoice = Invoice.objects.select_related('client', 'user').prefetch_related('items', 'payments').get(pk=invoice.pk)
    return InvoiceDetailSerializer(invoice, context={'request': request}).data


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


class InvoicePaymentCreateView(APIView):
    """Record a full or partial payment you received outside Stripe (PAY-3)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk, user=request.user)
        except Invoice.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = PaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            record_payment(
                invoice,
                data['amount_paid'],
                method=data.get('method', 'manual'),
                paid_on=data.get('paid_on'),
                notes=data.get('notes', ''),
            )
        except ValidationError as exc:
            return Response({'error': exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

        return Response(invoice_detail(invoice, request), status=status.HTTP_201_CREATED)
