import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class RecurringInvoice(models.Model):
    """A schedule plus the invoice template it stamps out (FEAT-4)."""

    FREQUENCY_CHOICES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recurring_invoices')
    client = models.ForeignKey('clients.Client', on_delete=models.PROTECT, related_name='recurring_invoices')
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES, default='monthly')
    start_date = models.DateField(default=timezone.localdate)
    end_date = models.DateField(null=True, blank=True)
    # The date the next invoice is due to be made; moved forward in the same transaction that makes it.
    next_run = models.DateField()
    is_active = models.BooleanField(default=True)
    auto_send = models.BooleanField(default=False, help_text='Email the invoice as soon as it is made')
    net_days = models.PositiveSmallIntegerField(default=30, validators=[MaxValueValidator(365)])

    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
    )
    notes = models.TextField(blank=True)
    pdf_color = models.CharField(max_length=20, default='indigo')
    pdf_template = models.CharField(max_length=20, default='professional')

    last_run = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['next_run', 'created_at']

    def __str__(self):
        return f'{self.get_frequency_display()} for {self.client.name}'


class RecurringItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    schedule = models.ForeignKey(RecurringInvoice, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(
        max_digits=10, decimal_places=2, default=1, validators=[MinValueValidator(Decimal('0.01'))]
    )
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
    )
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['position', 'id']
