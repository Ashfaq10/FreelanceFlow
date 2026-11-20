from decimal import Decimal

from django.db import transaction

from rest_framework import serializers

from apps.invoices.serializers import InvoiceItemWriteSerializer, TaxBreakdownMixin

from .models import Quote, QuoteItem


class QuoteItemSerializer(serializers.ModelSerializer):
    rate = serializers.DecimalField(source='unit_price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = QuoteItem
        fields = ['id', 'description', 'quantity', 'rate', 'unit_price', 'line_total', 'tax_rate']
        read_only_fields = fields


class QuoteSerializer(TaxBreakdownMixin, serializers.ModelSerializer):
    items = InvoiceItemWriteSerializer(many=True, write_only=True, required=False)
    lines = QuoteItemSerializer(source='items', many=True, read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    public_url = serializers.SerializerMethodField()
    tax_rate = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal('0'), max_value=Decimal('100'), required=False
    )
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0'), required=False)
    discount_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal('0'), max_value=Decimal('100'), required=False
    )

    class Meta:
        model = Quote
        fields = [
            'id', 'number', 'client', 'client_name', 'status', 'is_expired', 'issue_date', 'valid_until',
            'currency', 'tax_rate', 'discount_amount', 'discount_percent', 'notes', 'subtotal', 'tax_amount',
            'total', 'tax_breakdown', 'invoice', 'sent_at', 'responded_at', 'public_url', 'items', 'lines',
        ]  # fmt: skip
        read_only_fields = [
            'id', 'number', 'status', 'currency', 'subtotal', 'tax_amount', 'total', 'invoice', 'sent_at', 'responded_at',
        ]  # fmt: skip

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request is not None and request.user.is_authenticated:
            self.fields['client'].queryset = request.user.clients.filter(is_archived=False)  # SEC-1

    def get_public_url(self, obj) -> str:
        from django.conf import settings

        return f'{settings.FRONTEND_URL.rstrip("/")}/quote/{obj.public_token}'

    def validate(self, attrs):
        if self.instance is None and not attrs.get('items'):
            raise serializers.ValidationError({'items': 'At least one line item is required.'})
        if attrs.get('discount_amount') and attrs.get('discount_percent'):
            raise serializers.ValidationError({'discount_percent': 'Use a fixed discount or a percentage, not both.'})
        if attrs.get('discount_amount') and 'discount_percent' not in attrs:
            attrs['discount_percent'] = Decimal('0')
        issued, until = attrs.get('issue_date'), attrs.get('valid_until')
        if issued and until and until < issued:
            raise serializers.ValidationError({'valid_until': 'A quote cannot expire before it is issued.'})
        return attrs

    def _write_items(self, quote, items):
        lines = [
            QuoteItem(
                quote=quote,
                description=item['description'],
                quantity=item['quantity'],
                unit_price=item.get('rate', item.get('unit_price', 0)),
                tax_rate=item.get('tax_rate'),
                position=position,
            )
            for position, item in enumerate(items)
        ]
        for line in lines:
            line.line_total = line.compute_line_total()  # bulk_create skips save()
        QuoteItem.objects.bulk_create(lines)

    @transaction.atomic
    def create(self, validated_data):
        items = validated_data.pop('items')
        quote = Quote(user=self.context['request'].user, **validated_data)
        quote.save()
        self._write_items(quote, items)
        quote.save()  # totals from the stored lines
        return quote

    @transaction.atomic
    def update(self, instance, validated_data):
        items = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if items is not None:
            instance.items.all().delete()
            self._write_items(instance, items)
            getattr(instance, '_prefetched_objects_cache', {}).pop('items', None)  # the view prefetched the old lines
        instance.save()
        return instance


class PublicQuoteSerializer(TaxBreakdownMixin, serializers.ModelSerializer):
    """What a client holding the link may see (FEAT-4)."""

    items = QuoteItemSerializer(many=True, read_only=True)
    client_name = serializers.CharField(source='client.display_name', read_only=True)
    business_name = serializers.SerializerMethodField()
    business_email = serializers.CharField(source='user.business_email', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Quote
        fields = [
            'number', 'status', 'is_expired', 'issue_date', 'valid_until', 'currency', 'items', 'subtotal',
            'discount_amount', 'tax_amount', 'total', 'tax_breakdown', 'notes', 'client_name', 'business_name',
            'business_email',
        ]  # fmt: skip

    def get_business_name(self, obj) -> str:
        return obj.user.get_display_name()
