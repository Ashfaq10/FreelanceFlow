from decimal import Decimal

from rest_framework import serializers

from .models import Client, with_totals


class ClientSerializer(serializers.ModelSerializer):
    # Annotated by with_totals() in the views; field names are the ones the SPA reads (BUG-2).
    invoice_count = serializers.SerializerMethodField()
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

    def _total(self, obj, name):
        if not hasattr(obj, name):
            # Just created or updated, so it did not come through the annotated queryset.
            obj = with_totals(Client.objects.filter(pk=obj.pk)).get()
        return getattr(obj, name)

    def get_invoice_count(self, obj) -> int:
        return self._total(obj, 'invoice_count')

    def get_total_billed(self, obj) -> Decimal:
        return self._total(obj, 'total_billed')

    def get_total_paid(self, obj) -> Decimal:
        return self._total(obj, 'total_paid')

    def get_outstanding(self, obj) -> Decimal:
        return self._total(obj, 'outstanding')
