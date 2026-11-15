from rest_framework import serializers

from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    invoice_count = serializers.SerializerMethodField()
    # Field names the SPA reads; the old total_revenue/outstanding_amount names were never consumed (BUG-2).
    total_billed = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    outstanding = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            'id',
            'name',
            'email',
            'company',
            'address',
            'city',
            'state',
            'zip_code',
            'country',
            'phone',
            'notes',
            'is_archived',
            'created_at',
            'updated_at',
            'invoice_count',
            'total_billed',
            'total_paid',
            'outstanding',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_invoice_count(self, obj):
        return obj.get_invoice_count()

    def get_total_billed(self, obj):
        return obj.get_total_billed()

    def get_total_paid(self, obj):
        return obj.get_total_paid()

    def get_outstanding(self, obj):
        return obj.get_outstanding()
