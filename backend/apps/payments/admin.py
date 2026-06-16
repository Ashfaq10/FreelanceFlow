from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'invoice', 'amount_paid', 'method', 'paid_on', 'created_at'
    )
    list_filter = ('method', 'paid_on')
    search_fields = ('invoice__invoice_number', 'stripe_payment_id')
    readonly_fields = ('created_at',)
    ordering = ('-paid_on',)
