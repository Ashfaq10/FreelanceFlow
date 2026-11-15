from django.contrib import admin

from .models import TimeLog


@admin.register(TimeLog)
class TimeLogAdmin(admin.ModelAdmin):
    list_display = ('description', 'client', 'user', 'work_date', 'hours', 'hourly_rate', 'total_amount', 'is_billed')
    list_filter = ('is_billed', 'work_date', 'client')
    search_fields = ('description', 'client__name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-work_date',)

    def total_amount(self, obj):
        return f'${obj.total_amount:.2f}'

    total_amount.short_description = 'Total'
