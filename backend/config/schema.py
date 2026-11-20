"""Request and response shapes for endpoints that are plain APIViews, so OpenAPI can describe them (OPS-7)."""

from rest_framework import serializers

from apps.accounts.serializers import UserSerializer


class MessageSerializer(serializers.Serializer):
    message = serializers.CharField()


class ErrorSerializer(serializers.Serializer):
    error = serializers.CharField()


class UrlSerializer(serializers.Serializer):
    url = serializers.URLField()


class QueuedSerializer(serializers.Serializer):
    status = serializers.CharField(help_text='Always "queued"')
    message = serializers.CharField()


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password1 = serializers.CharField()
    password2 = serializers.CharField()


class SessionSerializer(serializers.Serializer):
    user = UserSerializer()


class LogoUploadSerializer(serializers.Serializer):
    logo = serializers.ImageField(help_text='PNG, JPEG or WebP')


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField()


class SendInvoiceSerializer(serializers.Serializer):
    message = serializers.CharField(required=False, allow_blank=True, help_text='Optional note above the invoice')


class CancelInvoiceSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255, help_text='Kept on the timeline')


class DashboardSummarySerializer(serializers.Serializer):
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    outstanding_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    overdue_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    this_month_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_billed = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_invoices = serializers.IntegerField()
    paid_count = serializers.IntegerField()
    sent_count = serializers.IntegerField()
    draft_count = serializers.IntegerField()
    overdue_count = serializers.IntegerField()
    status_counts = serializers.DictField(child=serializers.IntegerField())
    total_clients = serializers.IntegerField()


class MonthlyRevenueRowSerializer(serializers.Serializer):
    month = serializers.CharField(help_text='YYYY-MM')
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    count = serializers.IntegerField()
