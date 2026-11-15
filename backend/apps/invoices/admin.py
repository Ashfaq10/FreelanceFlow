from django.contrib import admin

from .models import Invoice, InvoiceItem


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1
    readonly_fields = ('line_total',)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'client', 'user', 'status', 'total', 'issue_date', 'due_date')
    list_filter = ('status', 'issue_date', 'due_date')
    search_fields = ('invoice_number', 'client__name', 'client__company')
    readonly_fields = ('invoice_number', 'subtotal', 'tax_amount', 'total', 'created_at', 'updated_at', 'sent_at')
    inlines = [InvoiceItemInline]
    ordering = ('-issue_date',)

    fieldsets = (
        (None, {'fields': ('user', 'client', 'invoice_number', 'status')}),
        ('Dates', {'fields': ('issue_date', 'due_date', 'sent_at')}),
        ('Amounts', {'fields': ('tax_rate', 'subtotal', 'tax_amount', 'total')}),
        ('Details', {'fields': ('notes', 'pdf_file', 'stripe_payment_url', 'stripe_session_id')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )
