import uuid

from django.db import models
from django.utils import timezone


class Payment(models.Model):
    METHOD_CHOICES = [
        ('stripe', 'Stripe'),
        ('bank', 'Bank Transfer'),
        ('cash', 'Cash'),
        ('check', 'Check'),
        ('manual', 'Manual'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.OneToOneField('invoices.Invoice', on_delete=models.CASCADE, related_name='payment')
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    paid_on = models.DateField(default=timezone.now)
    stripe_payment_id = models.CharField(max_length=255, blank=True)
    stripe_session_id = models.CharField(max_length=255, blank=True)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='stripe')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-paid_on', '-created_at']

    def __str__(self):
        return f'Payment for {self.invoice.invoice_number} - {self.amount_paid}'

    @property
    def is_full_payment(self):
        return self.amount_paid >= self.invoice.total
