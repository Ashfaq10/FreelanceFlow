from django.contrib import admin

from .models import Quote


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ('number', 'client', 'user', 'status', 'total', 'valid_until')
    list_filter = ('status',)
