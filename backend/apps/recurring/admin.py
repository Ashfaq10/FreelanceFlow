from django.contrib import admin

from .models import RecurringInvoice


@admin.register(RecurringInvoice)
class RecurringInvoiceAdmin(admin.ModelAdmin):
    list_display = ('client', 'user', 'frequency', 'next_run', 'is_active')
    list_filter = ('frequency', 'is_active')
