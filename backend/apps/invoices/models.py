import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


def default_due_date():
    return timezone.now() + timezone.timedelta(days=30)


class Invoice(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('overdue', 'Overdue'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='invoices')
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='invoices')
    invoice_number = models.CharField(max_length=50, editable=False)
    reference_number = models.CharField(max_length=100, blank=True)
    issue_date = models.DateTimeField(default=timezone.now)
    due_date = models.DateTimeField(default=default_due_date)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True, help_text='Payment terms or additional notes')
    pdf_file = models.FileField(upload_to='invoices/pdfs/', blank=True, null=True)
    stripe_payment_url = models.URLField(blank=True)
    stripe_session_id = models.CharField(max_length=255, blank=True)

    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-issue_date', '-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'invoice_number'],
                name='unique_invoice_number_per_user',
            ),
        ]

    def __str__(self):
        return f'{self.invoice_number} - {self.client.name}'

    def save(self, *args, **kwargs):
        from django.db import IntegrityError

        if not self.invoice_number:
            for _ in range(10):
                self.invoice_number = self.generate_invoice_number()
                self.calculate_totals()
                try:
                    super().save(*args, **kwargs)
                    return
                except IntegrityError:
                    self.invoice_number = ''
            raise IntegrityError('Could not generate a unique invoice number.')
        self.calculate_totals()
        super().save(*args, **kwargs)

    def generate_invoice_number(self):
        """Next number for this user in the current year (e.g. INV-2026-004)."""
        year = timezone.now().year
        prefix = f'INV-{year}-'

        existing = Invoice.objects.filter(
            user=self.user,
            invoice_number__startswith=prefix,
        ).values_list('invoice_number', flat=True)

        max_num = 0
        for number in existing:
            try:
                max_num = max(max_num, int(number.rsplit('-', 1)[-1]))
            except (ValueError, IndexError):
                continue

        return f'{prefix}{max_num + 1:03d}'

    def calculate_totals(self):
        from decimal import Decimal

        self.subtotal = sum(item.line_total for item in self.items.all())
        discount = Decimal(str(self.discount_amount or 0))
        tax_rate = Decimal(str(self.tax_rate or 0))
        taxable_subtotal = max(self.subtotal - discount, Decimal('0'))
        self.tax_amount = taxable_subtotal * (tax_rate / Decimal('100'))
        self.total = taxable_subtotal + self.tax_amount

    @property
    def is_overdue(self):
        return self.status == 'sent' and self.due_date < timezone.now()

    @property
    def is_editable(self):
        return self.status == 'draft'

    @property
    def days_until_due(self):
        if self.status == 'paid':
            return None
        delta = self.due_date - timezone.now()
        return delta.days

    def mark_as_sent(self):
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at'])

    def mark_as_paid(self):
        self.status = 'paid'
        self.save(update_fields=['status'])

    def mark_as_overdue(self):
        if self.status == 'sent':
            self.status = 'overdue'
            self.save(update_fields=['status'])

    def cancel(self):
        self.status = 'cancelled'
        self.save(update_fields=['status'])


class InvoiceItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.description} ({self.quantity} × {self.unit_price})'

    def save(self, *args, **kwargs):
        self.line_total = self.quantity * self.unit_price
        super().save(*args, **kwargs)
