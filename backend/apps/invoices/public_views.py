"""Unauthenticated invoice page for the client holding the link (FEAT-3).

The token in the URL is the only credential, so these views expose one invoice and nothing else,
never touch its status, and are rate-limited against token guessing.
"""

from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, throttling
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.services import PAYABLE_STATUSES, CheckoutUnavailable, payment_link
from config.schema import ErrorSerializer, UrlSerializer

from .models import Invoice
from .serializers import PublicInvoiceSerializer
from .utils import generate_pdf

VISIBLE_STATUSES = ('sent', 'overdue', 'paid')


class PublicInvoiceThrottle(throttling.AnonRateThrottle):
    scope = 'public_invoice'


class PublicInvoiceMixin:
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [PublicInvoiceThrottle]

    def get_invoice(self, token):
        # Drafts and cancelled invoices have no business being visible to a client.
        return get_object_or_404(
            Invoice.objects.select_related('client', 'user').prefetch_related('items', 'payments'),
            public_token=token,
            status__in=VISIBLE_STATUSES,
        )


class PublicInvoiceView(PublicInvoiceMixin, APIView):
    @extend_schema(responses=PublicInvoiceSerializer)
    def get(self, request, token):
        invoice = self.get_invoice(token)
        invoice.log_viewed()
        return Response(PublicInvoiceSerializer(invoice).data)


class PublicInvoicePDFView(PublicInvoiceMixin, APIView):
    @extend_schema(responses={(200, 'application/pdf'): OpenApiTypes.BINARY})
    def get(self, request, token):
        invoice = self.get_invoice(token)
        response = HttpResponse(generate_pdf(invoice), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
        return response


class PublicInvoiceCheckoutView(PublicInvoiceMixin, APIView):
    @extend_schema(request=None, responses={200: UrlSerializer, 400: ErrorSerializer, 503: ErrorSerializer})
    def post(self, request, token):
        invoice = self.get_invoice(token)

        if invoice.status not in PAYABLE_STATUSES:
            return Response({'error': 'This invoice is already paid.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            url = payment_link(invoice)
        except CheckoutUnavailable:
            # The client cannot fix our Stripe setup, so do not quote its error at them.
            return Response(
                {'error': 'Online payment is unavailable right now. Please contact the sender.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({'url': url})
