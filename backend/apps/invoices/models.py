import uuid
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

CENTS = Decimal('0.01')


def to_cents(amount):
    """Round money half-up to the cent; Django would otherwise round half-even when saving."""
    return Decimal(str(amount)).quantize(CENTS, rounding=ROUND_HALF_UP)


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
    # PROTECT: deleting a client must never take its invoices, payments and revenue with it (DATA-1).
    client = models.ForeignKey('clients.Client', on_delete=models.PROTECT, related_name='invoices')
    invoice_number = models.CharField(max_length=50, editable=False)
    reference_number = models.CharField(max_length=100, blank=True)
    issue_date = models.DateTimeField(default=timezone.now)
    due_date = models.DateTimeField(default=default_due_date)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    # Validators run in the admin and on full_clean(); the API enforces the same bounds in the serializer.
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
    )
    discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0'))]
    )
    notes = models.TextField(blank=True, help_text='Payment terms or additional notes')
    pdf_file = models.FileField(upload_to='invoices/pdfs/', blank=True, null=True)
    # Frozen at creation from the user's setting: changing the account currency must not restate old invoices (DATA-7).
    currency = models.CharField(max_length=3, blank=True)
    # Capability URL handed to the client so they can view and pay without an account (FEAT-3).
    public_token = models.CharField(max_length=32, unique=True, blank=True)
    # Accent colour of the rendered PDF; ids come from PDF_COLORS in utils.py (BUG-16).
    pdf_color = models.CharField(max_length=20, default='indigo')
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

        if not self.currency:
            self.currency = self.user.currency or 'USD'

        if not self.public_token:
            self.public_token = uuid.uuid4().hex

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
        self.subtotal = to_cents(sum(item.line_total for item in self.items.all()))
        discount = to_cents(self.discount_amount or 0)
        tax_rate = Decimal(str(self.tax_rate or 0))
        taxable_subtotal = max(self.subtotal - discount, Decimal('0'))
        self.tax_amount = to_cents(taxable_subtotal * tax_rate / Decimal('100'))
        self.total = taxable_subtotal + self.tax_amount

    @property
    def is_overdue(self):
        return self.status == 'sent' and self.due_date < timezone.now()

    @property
    def is_editable(self):
        return self.status == 'draft'

    @property
    def amount_paid(self):
        """Sum of recorded payments; partial payments are allowed (PAY-3)."""
        return to_cents(sum((payment.amount_paid for payment in self.payments.all()), Decimal('0')))

    @property
    def amount_due(self):
        return to_cents(self.total - self.amount_paid)

    def _require_status(self, new_status, allowed_from):
        if self.status not in allowed_from:
            raise ValidationError(f'An invoice that is {self.status} cannot become {new_status}.')

    def mark_as_sent(self):
        self._require_status('sent', ('draft', 'sent'))
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at'])

    def _discard_stored_pdf(self):
        """The stored PDF shows the old status; drop it so the next download re-renders (BUG-9)."""
        if self.pdf_file:
            self.pdf_file.delete(save=False)
            self.pdf_file = None

    def mark_as_paid(self):
        self._require_status('paid', ('sent', 'overdue'))
        self.status = 'paid'
        self._discard_stored_pdf()
        self.save(update_fields=['status', 'pdf_file'])

    def mark_as_overdue(self):
        if self.status == 'sent':
            self.status = 'overdue'
            self._discard_stored_pdf()
            self.save(update_fields=['status', 'pdf_file'])

    def reopen_after_refund(self):
        """Money went back to the client, so the invoice owes again (PAY-4)."""
        self._require_status('sent', ('paid',))
        self.status = 'overdue' if self.due_date < timezone.now() else 'sent'
        self._discard_stored_pdf()
        self.save(update_fields=['status', 'pdf_file'])

    def cancel(self):
        self._require_status('cancelled', ('draft', 'sent', 'overdue'))
        self.status = 'cancelled'
        self._discard_stored_pdf()
        self.save(update_fields=['status', 'pdf_file'])


class InvoiceItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(
        max_digits=10, decimal_places=2, default=1, validators=[MinValueValidator(Decimal('0.01'))]
    )
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    line_total = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.description} ({self.quantity} × {self.unit_price})'

    def compute_line_total(self):
        return to_cents(self.quantity * self.unit_price)

    def save(self, *args, **kwargs):
        self.line_total = self.compute_line_total()
        super().save(*args, **kwargs)
