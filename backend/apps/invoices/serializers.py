from django.utils import timezone

from rest_framework import serializers

from .models import Invoice, InvoiceItem


class InvoiceItemSerializer(serializers.ModelSerializer):
    rate = serializers.DecimalField(source='unit_price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = InvoiceItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'rate', 'line_total']
        read_only_fields = ['id', 'line_total', 'unit_price']


class InvoiceItemWriteSerializer(serializers.Serializer):
    """Accepts `rate` from the React frontend (maps to model `unit_price`)."""

    description = serializers.CharField(max_length=500)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=1)
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
            'notes',
            'items_count',
            'created_at',
        ]
        read_only_fields = ['id', 'invoice_number', 'subtotal', 'tax_amount', 'total', 'created_at']

    def get_items_count(self, obj):
        return obj.items.count()


class InvoiceWriteSerializer(serializers.ModelSerializer):
    issue_date = serializers.DateTimeField(required=False, default=timezone.now)
    due_date = serializers.DateTimeField(required=False, default=lambda: timezone.now() + timezone.timedelta(days=30))
    items = InvoiceItemWriteSerializer(many=True)

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
            'items',
        ]
        # Status only moves through the model's transition methods — DATA-2.
        read_only_fields = ['id', 'status']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Without this, any user could attach (and then email) another user's client — SEC-1.
        request = self.context.get('request')
        if request is not None:
            self.fields['client'].queryset = request.user.clients.all()

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('At least one line item is required.')
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = self.context['request'].user
        invoice = Invoice.objects.create(user=user, **validated_data)
        self._sync_items(invoice, items_data)
        invoice.save()
        return invoice

    def update(self, instance, validated_data):
        if not instance.is_editable:
            raise serializers.ValidationError('Only draft invoices can be edited.')

        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            self._sync_items(instance, items_data)
            instance.save()

        return instance

    def _sync_items(self, invoice, items_data):
        for item_data in items_data:
            rate = item_data.pop('rate', item_data.pop('unit_price', 0))
            InvoiceItem.objects.create(
                invoice=invoice,
                description=item_data['description'],
                quantity=item_data['quantity'],
                unit_price=rate,
            )


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
    currency = serializers.CharField(source='user.currency', read_only=True)
    logo_url = serializers.SerializerMethodField()
    payment_date = serializers.SerializerMethodField()

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

    def get_logo_url(self, obj):
        if not obj.user.logo:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.user.logo.url)
        return obj.user.logo.url

    def get_payment_date(self, obj):
        try:
            payment = obj.payment
        except Exception:
            payment = None
        return payment.paid_on if payment else None
