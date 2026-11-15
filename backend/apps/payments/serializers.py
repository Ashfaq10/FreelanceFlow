from rest_framework import serializers

from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    """A recorded payment; invoices can have several (PAY-3)."""

    amount = serializers.DecimalField(source='amount_paid', max_digits=10, decimal_places=2, min_value=0.01)

    class Meta:
        model = Payment
        fields = ['id', 'amount', 'paid_on', 'method', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']
