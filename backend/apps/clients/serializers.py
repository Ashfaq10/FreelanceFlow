from rest_framework import serializers

from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    invoice_count = serializers.SerializerMethodField()
    total_revenue = serializers.SerializerMethodField()
    outstanding_amount = serializers.SerializerMethodField()

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
            'total_revenue',
            'outstanding_amount',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_invoice_count(self, obj):
        return obj.get_invoice_count()

    def get_total_revenue(self, obj):
        return obj.get_total_revenue()

    def get_outstanding_amount(self, obj):
        return obj.get_outstanding_amount()
