from decimal import Decimal

from django.db import transaction

from rest_framework import serializers

from apps.invoices.serializers import InvoiceItemWriteSerializer
from apps.invoices.utils import PDF_COLORS, PDF_TEMPLATES

from .models import RecurringInvoice, RecurringItem


class RecurringItemSerializer(serializers.ModelSerializer):
    rate = serializers.DecimalField(source='unit_price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = RecurringItem
        fields = ['id', 'description', 'quantity', 'rate', 'tax_rate']
        read_only_fields = fields


class RecurringInvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemWriteSerializer(many=True, write_only=True, required=False)
    lines = RecurringItemSerializer(source='items', many=True, read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    pdf_color = serializers.ChoiceField(choices=sorted(PDF_COLORS), required=False)
    pdf_template = serializers.ChoiceField(choices=PDF_TEMPLATES, required=False)
    tax_rate = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal('0'), max_value=Decimal('100'), required=False
    )
    next_run = serializers.DateField(read_only=True)

    class Meta:
        model = RecurringInvoice
        fields = [
            'id', 'client', 'client_name', 'frequency', 'start_date', 'end_date', 'next_run', 'is_active',
            'auto_send', 'net_days', 'tax_rate', 'notes', 'pdf_color', 'pdf_template', 'last_run',
            'items', 'lines',
        ]  # fmt: skip
        read_only_fields = ['id', 'last_run']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request is not None and request.user.is_authenticated:
            self.fields['client'].queryset = request.user.clients.filter(is_archived=False)  # SEC-1

    def validate(self, attrs):
        if self.instance is None and not attrs.get('items'):
            raise serializers.ValidationError({'items': 'At least one line item is required.'})
        start, end = attrs.get('start_date'), attrs.get('end_date')
        if start and end and end < start:
            raise serializers.ValidationError({'end_date': 'The end date is before the start date.'})
        return attrs

    def _write_items(self, schedule, items):
        RecurringItem.objects.bulk_create(
            [
                RecurringItem(
                    schedule=schedule,
                    description=item['description'],
                    quantity=item['quantity'],
                    unit_price=item.get('rate', item.get('unit_price', 0)),
                    tax_rate=item.get('tax_rate'),
                    position=position,
                )
                for position, item in enumerate(items)
            ]
        )

    @transaction.atomic
    def create(self, validated_data):
        items = validated_data.pop('items')
        schedule = RecurringInvoice(user=self.context['request'].user, **validated_data)
        schedule.next_run = schedule.start_date
        schedule.save()
        self._write_items(schedule, items)
        return schedule

    @transaction.atomic
    def update(self, instance, validated_data):
        items = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if 'start_date' in validated_data and instance.last_run is None:
            instance.next_run = instance.start_date  # not started yet, so the first run follows the new date
        instance.save()
        if items is not None:
            instance.items.all().delete()
            self._write_items(instance, items)
        return instance
