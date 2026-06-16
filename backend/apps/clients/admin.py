from django.contrib import admin

from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('name', 'company', 'email', 'user', 'is_archived', 'created_at')
    list_filter = ('is_archived', 'created_at')
    search_fields = ('name', 'company', 'email')
    ordering = ('name',)
    readonly_fields = ('created_at', 'updated_at')
