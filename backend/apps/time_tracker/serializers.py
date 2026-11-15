from rest_framework import serializers

from .models import TimeLog


class TimeLogSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    date = serializers.DateField(source='work_date')

    class Meta:
        model = TimeLog
        fields = [
            'id',
            'client',
            'client_name',
            'description',
            'date',
            'hours',
            'hourly_rate',
            'is_billed',
            'invoice',
            'total_amount',
            'created_at',
        ]
        read_only_fields = ['id', 'is_billed', 'created_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Related objects must belong to the caller — SEC-1.
        request = self.context.get('request')
        if request is not None:
            self.fields['client'].queryset = request.user.clients.all()
            self.fields['invoice'].queryset = request.user.invoices.all()

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
