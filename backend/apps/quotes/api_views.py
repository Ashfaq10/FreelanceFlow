from django.conf import settings
from django.core.exceptions import ValidationError
from django.http import HttpResponse

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.invoices.api_views import SendEmailThrottle
from apps.invoices.serializers import InvoiceDetailSerializer
from config.celery import broker_reachable
from config.schema import ErrorSerializer, QueuedSerializer

from .models import Quote
from .pdf import generate_quote_pdf
from .serializers import QuoteSerializer
from .services import convert_quote
from .tasks import send_quote


class QuoteViewSet(viewsets.ModelViewSet):
    """Quotes belong to their creator; only drafts can change or go away."""

    serializer_class = QuoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # schema generation has no user
            return Quote.objects.none()
        return Quote.objects.filter(user=self.request.user).select_related('client').prefetch_related('items')

    def perform_update(self, serializer):
        if not serializer.instance.is_editable:
            raise DRFValidationError('Only draft quotes can be edited.')
        serializer.save()

    def perform_destroy(self, instance):
        if not instance.is_editable:
            raise DRFValidationError('Only draft quotes can be deleted.')
        instance.delete()


class OwnedQuoteMixin:
    permission_classes = [permissions.IsAuthenticated]

    def get_quote(self, request, pk):
        return Quote.objects.filter(pk=pk, user=request.user).select_related('client', 'user').first()


class QuoteSendView(OwnedQuoteMixin, APIView):
    throttle_classes = [SendEmailThrottle]

    @extend_schema(
        request=None,
        responses={200: QueuedSerializer, 400: ErrorSerializer, 403: ErrorSerializer, 503: ErrorSerializer},
    )
    def post(self, request, pk):
        quote = self.get_quote(request, pk)
        if quote is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if settings.EMAIL_VERIFICATION_REQUIRED and not request.user.email_verified:
            return Response(
                {'error': 'Confirm your email address before sending quotes. We sent you a link.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if quote.status not in ('draft', 'sent'):
            return Response({'error': 'This quote cannot be sent.'}, status=status.HTTP_400_BAD_REQUEST)
        if not quote.items.exists():
            return Response({'error': 'Add at least one line item before sending.'}, status=status.HTTP_400_BAD_REQUEST)
        if not broker_reachable():
            return Response(
                {'error': 'Sending is temporarily unavailable. Please try again shortly.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        send_quote.delay(str(quote.id))
        return Response({'status': 'queued', 'message': 'Quote is being sent.'})


class QuoteConvertView(OwnedQuoteMixin, APIView):
    @extend_schema(request=None, responses={201: InvoiceDetailSerializer, 400: ErrorSerializer})
    def post(self, request, pk):
        quote = self.get_quote(request, pk)
        if quote is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        try:
            invoice = convert_quote(quote)
        except ValidationError as exc:
            return Response({'error': exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            InvoiceDetailSerializer(invoice, context={'request': request}).data, status=status.HTTP_201_CREATED
        )


class QuotePDFView(OwnedQuoteMixin, APIView):
    @extend_schema(responses={(200, 'application/pdf'): OpenApiTypes.BINARY})
    def get(self, request, pk):
        quote = self.get_quote(request, pk)
        if quote is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        response = HttpResponse(generate_quote_pdf(quote), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{quote.number}.pdf"'
        return response
