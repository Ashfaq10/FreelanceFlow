"""The client's quote page (FEAT-4). Like the public invoice page: the token is the only credential, drafts are
invisible, and requests are throttled against token guessing."""

from django.core.exceptions import ValidationError
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.invoices.public_views import PublicInvoiceThrottle
from config.schema import ErrorSerializer, MessageSerializer

from .models import Quote
from .pdf import generate_quote_pdf
from .serializers import PublicQuoteSerializer

VISIBLE = ('sent', 'accepted', 'declined', 'converted')


class PublicQuoteMixin:
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [PublicInvoiceThrottle]

    def get_quote(self, token):
        return get_object_or_404(
            Quote.objects.select_related('client', 'user').prefetch_related('items'),
            public_token=token,
            status__in=VISIBLE,
        )


class PublicQuoteView(PublicQuoteMixin, APIView):
    @extend_schema(responses=PublicQuoteSerializer)
    def get(self, request, token):
        return Response(PublicQuoteSerializer(self.get_quote(token)).data)


class PublicQuotePDFView(PublicQuoteMixin, APIView):
    @extend_schema(responses={(200, 'application/pdf'): OpenApiTypes.BINARY})
    def get(self, request, token):
        quote = self.get_quote(token)
        response = HttpResponse(generate_quote_pdf(quote), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{quote.number}.pdf"'
        return response


class PublicQuoteRespondView(PublicQuoteMixin, APIView):
    accepted = True

    @extend_schema(request=None, responses={200: MessageSerializer, 400: ErrorSerializer})
    def post(self, request, token):
        quote = self.get_quote(token)
        try:
            quote.respond(self.accepted)
        except ValidationError as exc:
            return Response({'error': exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'message': 'Thank you. Your answer has been recorded.'})


class PublicQuoteDeclineView(PublicQuoteRespondView):
    accepted = False
