from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    # ChoiceField, not CharField: 'ZZZ' used to be stored and then rendered on every invoice (SEC-8).
    default_currency = serializers.ChoiceField(source='currency', choices=User.CURRENCY_CHOICES, required=False)
    created_at = serializers.DateTimeField(source='date_joined', read_only=True)
    logo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'business_name',
            'business_tagline',
            'business_email',
            'business_phone',
            'phone',
            'address',
            'logo',
            'default_currency',
            'tax_number',
            'bank_details',
            'invoice_terms',
            'invoice_prefix',
            'reminders_enabled',
            'remind_before_days',
            'overdue_repeat_days',
            'website',
            'created_at',
        ]
        read_only_fields = ['id', 'email', 'created_at']

    def validate_invoice_prefix(self, value):
        return value.upper()

    def get_logo(self, obj) -> str | None:
        if not obj.logo:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.logo.url)
        return obj.logo.url
