from django.db import models
from django.http import FileResponse, HttpResponse

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Invoice
from .serializers import (
    InvoiceDetailSerializer,
    InvoiceSerializer,
    InvoiceWriteSerializer,
)
from .tasks import generate_and_store_pdf, send_invoice_email
from .utils import generate_pdf


class InvoiceListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return InvoiceWriteSerializer
        return InvoiceSerializer

    def get_queryset(self):
        queryset = Invoice.objects.filter(user=self.request.user)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        client_filter = self.request.query_params.get('client')
        if client_filter:
            queryset = queryset.filter(client_id=client_filter)

        search = self.request.query_params.get('search')
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


class InvoiceSendView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk, user=request.user)
        except Invoice.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if invoice.status not in ['draft', 'sent']:
            return Response({'error': 'This invoice cannot be sent.'}, status=status.HTTP_400_BAD_REQUEST)

        generate_and_store_pdf.delay(str(invoice.id))
        send_invoice_email.delay(str(invoice.id))

        return Response({'status': 'Invoice is being sent.'})


class InvoicePDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            invoice = (
                Invoice.objects.select_related('client', 'user', 'payment')
                .prefetch_related('items')
                .get(pk=pk, user=request.user)
            )
        except Invoice.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        template = request.query_params.get('template', 'professional')
        color = request.query_params.get('color', 'indigo')
        timezone_str = request.query_params.get('timezone')

        if invoice.pdf_file and not request.query_params.get('regenerate'):
            response = FileResponse(invoice.pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
            return response

        pdf_bytes = generate_pdf(invoice, template=template, color=color, timezone_str=timezone_str)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
        return response


class InvoiceMarkPaidView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk, user=request.user)
        except Invoice.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if invoice.status == 'paid':
            return Response(
                {'message': 'Invoice is already marked as paid.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.payments.models import Payment

        invoice.mark_as_paid()
        Payment.objects.get_or_create(
            invoice=invoice,
            defaults={
                'amount_paid': invoice.total,
                'method': 'manual',
                'notes': 'Marked paid manually',
            },
        )
        invoice = (
            Invoice.objects.select_related('client', 'user', 'payment').prefetch_related('items').get(pk=invoice.pk)
        )
        serializer = InvoiceDetailSerializer(invoice, context={'request': request})
        return Response(serializer.data)
