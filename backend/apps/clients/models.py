import uuid

from django.conf import settings
from django.db import models
from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce


class Client(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='clients')
    name = models.CharField(max_length=255)
    email = models.EmailField(help_text='Invoice delivery email')
    company = models.CharField(max_length=255, blank=True)
    address = models.TextField(blank=True, help_text='Appears on PDF invoice')
    city = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=120, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = ['user', 'email']

    def __str__(self):
        return self.display_name

    @property
    def display_name(self):
        return self.company if self.company else self.name

    @property
    def full_address(self):
        parts = []
        if self.address:
            parts.append(self.address.strip())
        city_line = ', '.join([p for p in [self.city, self.state] if p])
        if city_line or self.zip_code:
            zip_part = f' {self.zip_code}' if self.zip_code else ''
            parts.append(f'{city_line}{zip_part}'.strip())
        if self.country:
            parts.append(self.country)
        return ', '.join([p for p in parts if p])


BILLED_STATUSES = ('sent', 'overdue', 'paid')  # drafts and cancelled invoices are not billed


def with_totals(queryset):
    """Annotate invoice_count / total_billed / total_paid / outstanding in one query (PERF-1)."""

    def total(statuses):
        return Coalesce(
            Sum('invoices__total', filter=Q(invoices__status__in=statuses)),
            Value(0),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        )

    return queryset.annotate(
        invoice_count=Count('invoices'),
        total_billed=total(BILLED_STATUSES),
        total_paid=total(('paid',)),
        outstanding=total(('sent', 'overdue')),
    )
