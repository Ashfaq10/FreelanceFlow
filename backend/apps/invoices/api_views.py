from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.http import FileResponse, HttpResponse

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from config.celery import broker_reachable
from config.schema import CancelInvoiceSerializer, ErrorSerializer, QueuedSerializer, SendInvoiceSerializer

from .credit import issue_credit_note
from .models import CreditNote, Invoice, InvoiceItem
from .serializers import (
    CreditNoteCreateSerializer,
    CreditNoteSerializer,
    InvoiceDetailSerializer,
    InvoiceFilterSerializer,
    InvoiceSerializer,
    InvoiceWriteSerializer,
)
from .tasks import send_invoice, send_reminder
from .utils import generate_credit_note_pdf, generate_pdf


class InvoiceListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return InvoiceWriteSerializer
        return InvoiceSerializer

    def get_queryset(self):
        filters = InvoiceFilterSerializer(data=self.request.query_params)
        filters.is_valid(raise_exception=True)  # a bad ?client= or ?status= used to be a 500 (BUG-17)
        params = filters.validated_data

        queryset = Invoice.objects.filter(user=self.request.user)

        if params.get('status'):
            queryset = queryset.filter(status=params['status'])

        if params.get('client'):
            queryset = queryset.filter(client_id=params['client'])

        search = params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(invoice_number__icontains=search)
                | models.Q(client__name__icontains=search)
                | models.Q(client__company__icontains=search)
            )

        return queryset.select_related('client').prefetch_related('items').order_by('-issue_date')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()
        output = InvoiceDetailSerializer(invoice, context={'request': request})
        return Response(output.data, status=status.HTTP_201_CREATED)


class InvoiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return InvoiceWriteSerializer
        return InvoiceDetailSerializer

    def get_queryset(self):
        return Invoice.objects.filter(user=self.request.user).select_related('client', 'user').prefetch_related('items')

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()
        output = InvoiceDetailSerializer(invoice, context={'request': request})
        return Response(output.data)

    def destroy(self, request, *args, **kwargs):
        invoice = self.get_object()
        if not invoice.is_editable:
            return Response({'error': 'Only draft invoices can be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


class SendEmailThrottle(UserRateThrottle):
    scope = 'send_email'


class InvoiceSendView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [SendEmailThrottle]

    @extend_schema(
        request=SendInvoiceSerializer,
        responses={200: QueuedSerializer, 400: ErrorSerializer, 503: ErrorSerializer},
    )
    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk, user=request.user)
        except Invoice.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if settings.EMAIL_VERIFICATION_REQUIRED and not request.user.email_verified:
            return Response(
                {'error': 'Confirm your email address before sending invoices. We sent you a link.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if invoice.status not in ['draft', 'sent', 'overdue']:
            return Response({'error': 'This invoice cannot be sent.'}, status=status.HTTP_400_BAD_REQUEST)

        if not invoice.items.exists():
            return Response({'error': 'Add at least one line item before sending.'}, status=status.HTTP_400_BAD_REQUEST)

        # delay() retries a dead broker forever, so probe first and say so instead of hanging (OPS-9).
        if not broker_reachable():
            return Response(
                {'error': 'Sending is temporarily unavailable. Please try again shortly.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        send_invoice.delay(str(invoice.id), request.data.get('message', ''))

        return Response({'status': 'queued', 'message': 'Invoice is being sent.'})


class InvoicePDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        parameters=[OpenApiParameter('regenerate', bool), OpenApiParameter('timezone', str)],
        responses={(200, 'application/pdf'): OpenApiTypes.BINARY},
    )
    def get(self, request, pk):
        try:
            invoice = (
                Invoice.objects.select_related('client', 'user').prefetch_related('items').get(pk=pk, user=request.user)
            )
        except Invoice.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        timezone_str = request.query_params.get('timezone')

        if invoice.pdf_file and not request.query_params.get('regenerate'):
            response = FileResponse(invoice.pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
            return response

        pdf_bytes = generate_pdf(invoice, timezone_str=timezone_str)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
        return response


class InvoiceMarkPaidView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={200: InvoiceDetailSerializer, 400: ErrorSerializer})
    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk, user=request.user)
        except Invoice.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        from apps.payments.api_views import invoice_detail
        from apps.payments.services import record_payment

        if invoice.status not in ('sent', 'overdue'):
            return Response(
                {'error': f'An invoice that is {invoice.status} cannot become paid.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if invoice.amount_due > 0:
                # Settles whatever is left, so it still works after a deposit (PAY-3).
                record_payment(invoice, invoice.amount_due, method='manual', notes='Marked paid manually')
            else:
                invoice.mark_as_paid()
        except ValidationError as exc:
            return Response({'error': exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

        return Response(invoice_detail(invoice, request))


class InvoiceCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=CancelInvoiceSerializer, responses={200: InvoiceDetailSerializer, 400: ErrorSerializer})
    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk, user=request.user)
        except Invoice.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        try:
            invoice.cancel(str(request.data.get('reason') or '').strip()[:255])
        except ValidationError as exc:
            return Response({'error': exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

        serializer = InvoiceDetailSerializer(invoice, context={'request': request})
        return Response(serializer.data)


class InvoiceCreditNoteView(APIView):
    """Lower what a sent invoice owes, with a numbered, append-only record (FEAT-4)."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=CreditNoteCreateSerializer,
        responses={201: CreditNoteSerializer, 400: ErrorSerializer},
    )
    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk, user=request.user)
        except Invoice.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        data = CreditNoteCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        try:
            note = issue_credit_note(invoice, data.validated_data['amount'], data.validated_data['reason'])
        except ValidationError as exc:
            return Response({'error': exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CreditNoteSerializer(note).data, status=status.HTTP_201_CREATED)


class CreditNotePDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={(200, 'application/pdf'): OpenApiTypes.BINARY})
    def get(self, request, pk):
        try:
            note = CreditNote.objects.select_related('invoice__user', 'invoice__client').get(pk=pk, user=request.user)
        except CreditNote.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        response = HttpResponse(generate_credit_note_pdf(note), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{note.number}.pdf"'
        return response


class InvoiceDuplicateView(APIView):
    """Copy an invoice into a fresh draft (FEAT-2)."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={201: InvoiceDetailSerializer})
    def post(self, request, pk):
        try:
            invoice = Invoice.objects.prefetch_related('items').get(pk=pk, user=request.user)
        except Invoice.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            copy = Invoice.objects.create(
                user=invoice.user,
                client=invoice.client,
                reference_number=invoice.reference_number,
                discount_amount=invoice.discount_amount,
                discount_percent=invoice.discount_percent,
                tax_rate=invoice.tax_rate,
                notes=invoice.notes,
                currency=invoice.currency,
                pdf_color=invoice.pdf_color,
                pdf_template=invoice.pdf_template,
            )
            InvoiceItem.objects.bulk_create(
                [
                    InvoiceItem(
                        invoice=copy,
                        description=item.description,
                        quantity=item.quantity,
                        unit_price=item.unit_price,
                        line_total=item.line_total,
                        tax_rate=item.tax_rate,
                        position=item.position,
                    )
                    for item in invoice.items.all()
                ]
            )
            copy.save()  # recalculates totals from the copied items

        serializer = InvoiceDetailSerializer(copy, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class InvoiceRemindView(APIView):
    """Chase a sent or overdue invoice by hand (FEAT-2)."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [SendEmailThrottle]

    @extend_schema(request=None, responses={200: QueuedSerializer, 400: ErrorSerializer, 503: ErrorSerializer})
    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk, user=request.user)
        except Invoice.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if invoice.status not in ('sent', 'overdue'):
            return Response(
                {'error': 'Only sent or overdue invoices can be chased.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not broker_reachable():
            return Response(
                {'error': 'Reminders are temporarily unavailable. Please try again shortly.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        send_reminder.delay(str(invoice.id))

        return Response({'status': 'queued', 'message': 'Reminder is being sent.'})
