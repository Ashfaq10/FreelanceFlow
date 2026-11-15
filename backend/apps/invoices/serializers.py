import datetime
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from rest_framework import serializers

from apps.payments.serializers import PaymentSerializer

from .models import Invoice, InvoiceItem
from .utils import PDF_COLORS, public_invoice_url


class InvoiceFilterSerializer(serializers.Serializer):
    """Query params for the invoice list; invalid values answer 400, not 500 (BUG-17)."""

    status = serializers.ChoiceField(choices=[choice[0] for choice in Invoice.STATUS_CHOICES], required=False)
    client = serializers.UUIDField(required=False)
    search = serializers.CharField(required=False, allow_blank=True)
    page = serializers.IntegerField(min_value=1, required=False)
    page_size = serializers.IntegerField(min_value=1, required=False)


class InvoiceItemSerializer(serializers.ModelSerializer):
    rate = serializers.DecimalField(source='unit_price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = InvoiceItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'rate', 'line_total']
        read_only_fields = ['id', 'line_total', 'unit_price']


class InvoiceItemWriteSerializer(serializers.Serializer):
    """Accepts `rate` from the React frontend (maps to model `unit_price`)."""

    description = serializers.CharField(max_length=500)
    # 0.01 and not 1: half-hour and fractional-unit lines are normal (DATA-5).
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    rate = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)

    def to_internal_value(self, data):
        """Also accept legacy `unit_price` key from API clients."""
        if isinstance(data, dict) and 'unit_price' in data and 'rate' not in data:
            data = {**data, 'rate': data['unit_price']}
        return super().to_internal_value(data)


class InvoiceSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id',
            'invoice_number',
            'client',
            'client_name',
            'reference_number',
            'issue_date',
            'due_date',
            'status',
            'subtotal',
            'discount_amount',
            'tax_rate',
            'tax_amount',
            'total',
            'currency',
            'notes',
            'items_count',
            'created_at',
        ]
        read_only_fields = ['id', 'invoice_number', 'subtotal', 'tax_amount', 'total', 'created_at']

    def get_items_count(self, obj) -> int:
        return obj.items.count()


class InvoiceWriteSerializer(serializers.ModelSerializer):
    issue_date = serializers.DateTimeField(required=False, default=timezone.now)
    due_date = serializers.DateTimeField(required=False, default=lambda: timezone.now() + timezone.timedelta(days=30))
    items = InvoiceItemWriteSerializer(many=True)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0'), required=False)
    tax_rate = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal('0'), max_value=Decimal('100'), required=False
    )
    pdf_color = serializers.ChoiceField(choices=sorted(PDF_COLORS), required=False)

    class Meta:
        model = Invoice
        fields = [
            'id',
            'client',
            'reference_number',
            'issue_date',
            'due_date',
            'status',
            'discount_amount',
            'tax_rate',
            'notes',
            'pdf_color',
            'items',
        ]
        # Status only moves through the model's transition methods — DATA-2.
        read_only_fields = ['id', 'status']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Without this, any user could attach (and then email) another user's client — SEC-1.
        request = self.context.get('request')
        if request is not None and request.user.is_authenticated:
            self.fields['client'].queryset = request.user.clients.all()

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('At least one line item is required.')
        return value

    def validate(self, attrs):
        """A discount larger than the subtotal would otherwise silently become a zero total."""
        items = attrs.get('items')
        discount = attrs.get('discount_amount')
        if items and discount is not None:
            subtotal = sum(item['quantity'] * item['rate'] for item in items)
            if discount > subtotal:
                raise serializers.ValidationError(
                    {'discount_amount': f'Discount cannot exceed the subtotal of {subtotal:.2f}.'}
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        invoice = Invoice(user=self.context['request'].user, **validated_data)
        invoice.save()
        self._replace_items(invoice, items_data)
        return invoice

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        # The accent colour is cosmetic, so it stays editable after the invoice is sent (BUG-16).
        cosmetic_only = items_data is None and set(validated_data) <= {'pdf_color'}
        if not cosmetic_only and not instance.is_editable:
            raise serializers.ValidationError('Only draft invoices can be edited.')

        if 'pdf_color' in validated_data and validated_data['pdf_color'] != instance.pdf_color:
            instance._discard_stored_pdf()  # the stored file still has the old colour

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if items_data is None:
            instance.save()
        else:
            instance.items.all().delete()
            self._replace_items(instance, items_data)

        return instance

    def _replace_items(self, invoice, items_data):
        items = []
        for item_data in items_data:
            rate = item_data.pop('rate', item_data.pop('unit_price', 0))
            item = InvoiceItem(
                invoice=invoice,
                description=item_data['description'],
                quantity=item_data['quantity'],
                unit_price=rate,
            )
            # bulk_create skips save(), so the line total is computed here.
            item.line_total = item.compute_line_total()
            items.append(item)

        InvoiceItem.objects.bulk_create(items)
        invoice.save()  # recalculates totals from the stored items, once


class InvoiceDetailSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    client_company = serializers.CharField(source='client.company', read_only=True)
    client_display_name = serializers.CharField(source='client.display_name', read_only=True)
    client_email = serializers.CharField(source='client.email', read_only=True)
    client_address = serializers.CharField(source='client.address', read_only=True)
    client_full_address = serializers.CharField(source='client.full_address', read_only=True)
    client_phone = serializers.CharField(source='client.phone', read_only=True)
    business_name = serializers.CharField(source='user.business_name', read_only=True)
    business_tagline = serializers.CharField(source='user.business_tagline', read_only=True)
    business_email = serializers.CharField(source='user.business_email', read_only=True)
    business_phone = serializers.CharField(source='user.business_phone', read_only=True)
    website = serializers.CharField(source='user.website', read_only=True)
    tax_number = serializers.CharField(source='user.tax_number', read_only=True)
    bank_details = serializers.CharField(source='user.bank_details', read_only=True)
    invoice_terms = serializers.CharField(source='user.invoice_terms', read_only=True)
    user_address = serializers.CharField(source='user.address', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    currency = serializers.CharField(read_only=True)
    logo_url = serializers.SerializerMethodField()
    public_url = serializers.SerializerMethodField()
    payment_date = serializers.SerializerMethodField()
    payments = PaymentSerializer(many=True, read_only=True)
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    amount_due = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id',
            'invoice_number',
            'client',
            'client_name',
            'client_email',
            'client_address',
            'client_full_address',
            'client_phone',
            'client_company',
            'client_display_name',
            'reference_number',
            'issue_date',
            'due_date',
            'status',
            'subtotal',
            'discount_amount',
            'tax_rate',
            'tax_amount',
            'total',
            'notes',
            'pdf_color',
            'stripe_payment_url',
            'pdf_file',
            'items',
            'created_at',
            'updated_at',
            'sent_at',
            'business_name',
            'business_tagline',
            'business_email',
            'business_phone',
            'website',
            'tax_number',
            'bank_details',
            'invoice_terms',
            'user_address',
            'user_phone',
            'user_email',
            'currency',
            'logo_url',
            'payment_date',
            'payments',
            'amount_paid',
            'amount_due',
            'public_url',
        ]
        read_only_fields = [
            'id',
            'invoice_number',
            'subtotal',
            'tax_amount',
            'total',
            'stripe_payment_url',
            'pdf_file',
            'created_at',
            'updated_at',
            'sent_at',
        ]

    def get_logo_url(self, obj) -> str | None:
        if not obj.user.logo:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.user.logo.url)
        return obj.user.logo.url

    def get_payment_date(self, obj) -> datetime.date | None:
        last = obj.payments.order_by('paid_on').last()
        return last.paid_on if last else None

    def get_public_url(self, obj) -> str:
        return public_invoice_url(obj)


class PublicInvoiceSerializer(serializers.ModelSerializer):
    """What a client holding the link may see — no account, no other invoices (FEAT-3)."""

    items = InvoiceItemSerializer(many=True, read_only=True)
    client_name = serializers.CharField(source='client.display_name', read_only=True)
    business_name = serializers.SerializerMethodField()
    business_email = serializers.CharField(source='user.business_email', read_only=True)
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    amount_due = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'invoice_number',
            'status',
            'issue_date',
            'due_date',
            'currency',
            'items',
            'subtotal',
            'discount_amount',
            'tax_rate',
            'tax_amount',
            'total',
            'amount_paid',
            'amount_due',
            'notes',
            'client_name',
            'business_name',
            'business_email',
        ]

    def get_business_name(self, obj) -> str:
        return obj.user.get_display_name()
