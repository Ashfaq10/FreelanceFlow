"""Money is quantized to cents on the server (DATA-3)."""
from decimal import Decimal

import pytest

from apps.invoices.models import InvoiceItem

from .factories import InvoiceFactory


@pytest.mark.django_db
class TestLineTotalRounding:
    def test_line_total_is_rounded_half_up(self, invoice):
        item = InvoiceItem.objects.create(
            invoice=invoice, description='Consulting', quantity=Decimal('1.50'), unit_price=Decimal('0.33')
        )

        # 0.495 → 0.50, not banker's 0.49.
        assert item.line_total == Decimal('0.50')

    def test_subtotal_is_the_sum_of_stored_line_totals(self, invoice):
        for _ in range(3):
            InvoiceItem.objects.create(
                invoice=invoice, description='Hour', quantity=Decimal('1.50'), unit_price=Decimal('0.33')
            )

        invoice.calculate_totals()

        assert invoice.subtotal == Decimal('1.50')


@pytest.mark.django_db
class TestTotalsRounding:
    def test_tax_is_quantized_and_total_adds_up(self, user, client_obj):
        invoice = InvoiceFactory(user=user, client=client_obj, tax_rate=Decimal('10.00'))
        InvoiceItem.objects.create(
            invoice=invoice, description='Work', quantity=1, unit_price=Decimal('1.25')
        )

        invoice.calculate_totals()

        assert invoice.tax_amount == Decimal('0.13')  # 0.125 → 0.13 half-up
        assert invoice.total == invoice.subtotal - invoice.discount_amount + invoice.tax_amount

    def test_discount_is_applied_before_tax(self, user, client_obj):
        invoice = InvoiceFactory(
            user=user, client=client_obj, tax_rate=Decimal('20.00'), discount_amount=Decimal('10.00')
        )
        InvoiceItem.objects.create(invoice=invoice, description='Work', quantity=1, unit_price=Decimal('100.00'))

        invoice.calculate_totals()

        assert invoice.tax_amount == Decimal('18.00')
        assert invoice.total == Decimal('108.00')

    def test_saved_totals_survive_a_round_trip(self, user, client_obj):
        """Django quantizes DecimalFields on save; stored values must equal the computed ones."""
        invoice = InvoiceFactory(user=user, client=client_obj, tax_rate=Decimal('7.25'))
        InvoiceItem.objects.create(invoice=invoice, description='Work', quantity=3, unit_price=Decimal('19.99'))

        invoice.calculate_totals()
        invoice.save()
        invoice.refresh_from_db()

        assert invoice.total == invoice.subtotal - invoice.discount_amount + invoice.tax_amount
