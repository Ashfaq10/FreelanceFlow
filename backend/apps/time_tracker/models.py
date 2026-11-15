import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class TimeLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='time_logs')
    invoice = models.ForeignKey(
        'invoices.Invoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='time_logs'
    )
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='time_logs')
    description = models.CharField(max_length=500, help_text='What was worked on')
    work_date = models.DateField(default=timezone.now)
    hours = models.DecimalField(max_digits=5, decimal_places=2)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    is_billed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-work_date', '-created_at']

    def __str__(self):
        return f'{self.description} - {self.hours}h @ {self.hourly_rate}/hr'

    @property
    def total_amount(self):
        return self.hours * self.hourly_rate

    def link_to_invoice(self, invoice):
        """Link this time log to an invoice and mark as billed."""
        self.invoice = invoice
        self.is_billed = True
        self.save(update_fields=['invoice', 'is_billed'])
