import uuid
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import IntegrityError, models, transaction
from django.utils import timezone

from apps.invoices.totals import calculate, tax_breakdown, to_cents


def default_valid_until():
    return timezone.localdate() + timedelta(days=30)


class Quote(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('converted', 'Converted to invoice'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quotes')
    client = models.ForeignKey('clients.Client', on_delete=models.PROTECT, related_name='quotes')
    number = models.CharField(max_length=50, editable=False)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    issue_date = models.DateField(default=timezone.localdate)
    valid_until = models.DateField(default=default_valid_until)
    currency = models.CharField(max_length=3, blank=True)
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
    )
    discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0'))]
    )
    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
    )
    notes = models.TextField(blank=True)
    # Capability URL for the client's accept/decline page; the token is the only credential.
    public_token = models.CharField(max_length=32, unique=True, blank=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    invoice = models.ForeignKey(
        'invoices.Invoice', null=True, blank=True, on_delete=models.SET_NULL, related_name='source_quotes'
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-issue_date', '-created_at']
        constraints = [models.UniqueConstraint(fields=['user', 'number'], name='unique_quote_number_per_user')]

    def __str__(self):
        return f'{self.number} - {self.client.name}'

    def save(self, *args, **kwargs):
        if not self.currency:
            self.currency = self.user.currency or 'USD'
        if not self.public_token:
            self.public_token = uuid.uuid4().hex
        if self.pk and not self._state.adding:
            self.calculate_totals()
        if self.number:
            return super().save(*args, **kwargs)
        for _ in range(10):
            self.number = self._next_number()
            try:
                with transaction.atomic():
                    return super().save(*args, **kwargs)
            except IntegrityError:  # two quotes raced for the same number
                self.number = ''
        raise IntegrityError('Could not generate a unique quote number.')

    def _next_number(self):
        prefix = f'QT-{timezone.now().year}-'
        numbers = Quote.objects.filter(user=self.user, number__startswith=prefix).values_list('number', flat=True)
        return f'{prefix}{max((int(n.rsplit("-", 1)[-1]) for n in numbers), default=0) + 1:03d}'

    def calculate_totals(self):
        result = calculate(list(self.items.all()), self.tax_rate, self.discount_amount, self.discount_percent)
        self.subtotal, self.discount_amount = result['subtotal'], result['discount_amount']
        self.tax_amount, self.total = result['tax_amount'], result['total']

    def tax_breakdown(self):
        items = list(self.items.all())
        discount = min(to_cents(self.discount_amount or 0), to_cents(sum(i.line_total for i in items)))
        return tax_breakdown(items, self.tax_rate, discount)

    @property
    def is_editable(self):
        return self.status == 'draft'

    @property
    def is_expired(self):
        return self.status == 'sent' and self.valid_until < timezone.localdate()

    def mark_as_sent(self):
        if self.status not in ('draft', 'sent'):
            raise ValidationError(f'A quote that is {self.status} cannot be sent.')
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at'])

    def respond(self, accepted):
        """The client's answer. Only an open (sent, unexpired) quote can be answered."""
        if self.status != 'sent':
            raise ValidationError('This quote has already been answered.' if self.status != 'draft' else 'Not found.')
        if self.is_expired:
            raise ValidationError('This quote has expired.')
        self.status = 'accepted' if accepted else 'declined'
        self.responded_at = timezone.now()
        self.save(update_fields=['status', 'responded_at'])


class QuoteItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(
        max_digits=10, decimal_places=2, default=1, validators=[MinValueValidator(Decimal('0.01'))]
    )
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    line_total = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
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

    def compute_line_total(self):
        return to_cents(self.quantity * self.unit_price)

    def save(self, *args, **kwargs):
        self.line_total = self.compute_line_total()
        super().save(*args, **kwargs)
