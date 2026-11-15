from django.core.exceptions import ValidationError

from drf_spectacular.utils import extend_schema
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.invoices.models import Invoice
from apps.invoices.serializers import InvoiceDetailSerializer
from config.schema import ErrorSerializer

from .billing import bill_time_logs
from .models import TimeLog
from .serializers import TimeLogSerializer


class BillTimeLogsSerializer(serializers.Serializer):
    time_logs = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)
    invoice = serializers.UUIDField(required=False)


class TimeLogViewSet(viewsets.ModelViewSet):
    serializer_class = TimeLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # schema generation has no user
            return TimeLog.objects.none()
        return TimeLog.objects.filter(user=self.request.user)


class BillTimeLogsView(APIView):
    """Put tracked hours on a draft invoice, new or existing (FEAT-1)."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=BillTimeLogsSerializer, responses={201: InvoiceDetailSerializer, 400: ErrorSerializer})
    def post(self, request):
        payload = BillTimeLogsSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        time_logs = TimeLog.objects.filter(user=request.user, id__in=data['time_logs'])
        if len(time_logs) != len(set(data['time_logs'])):
            return Response({'error': 'Some of those time logs do not exist.'}, status=status.HTTP_404_NOT_FOUND)

        invoice = None
        if data.get('invoice'):
            try:
                invoice = Invoice.objects.get(pk=data['invoice'], user=request.user)
            except Invoice.DoesNotExist:
                return Response(status=status.HTTP_404_NOT_FOUND)

        try:
            invoice = bill_time_logs(request.user, time_logs, invoice)
        except ValidationError as exc:
            return Response({'error': exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

        invoice = (
            Invoice.objects.select_related('client', 'user').prefetch_related('items', 'payments').get(pk=invoice.pk)
        )
        serializer = InvoiceDetailSerializer(invoice, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
