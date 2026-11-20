from decimal import Decimal

import pytest

from apps.invoices.models import Invoice, InvoiceItem

from .factories import ClientFactory, InvoiceFactory, UserFactory
from .test_pdf_render import render


def make(user, client, lines, **fields):
    invoice = Invoice.objects.create(user=user, client=client, **fields)
    for position, (price, rate) in enumerate(lines):
        InvoiceItem.objects.create(
            invoice=invoice, description='x', quantity=1, unit_price=price, tax_rate=rate, position=position
        )
    invoice.save()
    invoice.refresh_from_db()
    return invoice


@pytest.mark.django_db
class TestTotals:
    def test_inheriting_lines_keep_the_single_rate_result(self, user, client_obj):
        invoice = make(
            user, client_obj, [('33.33', None), ('66.67', None)], tax_rate=Decimal('7.5'), discount_amount=10
        )

        # Same as the old formula: round((100 - 10) * 7.5%) = 6.75.
        assert (invoice.subtotal, invoice.tax_amount, invoice.total) == (
            Decimal('100.00'),
            Decimal('6.75'),
            Decimal('96.75'),
        )

    def test_two_rates_are_taxed_separately(self, user, client_obj):
        invoice = make(user, client_obj, [('100', '20'), ('100', '5')])

        assert invoice.tax_amount == Decimal('25.00')
        assert [(r['rate'], r['tax']) for r in invoice.tax_breakdown()] == [(20, 20), (5, 5)]  # highest rate first

    def test_a_discount_lowers_each_rates_taxable_base_and_sums_exactly(self, user, client_obj):
        invoice = make(user, client_obj, [('100', '20'), ('300', '5')], discount_amount=40)

        rows = invoice.tax_breakdown()
        assert [r['taxable'] for r in rows] == [Decimal('90.00'), Decimal('270.00')]  # 10 and 30 of the discount
        assert invoice.tax_amount == Decimal('18.00') + Decimal('13.50')
        assert invoice.total == Decimal('400.00') - 40 + invoice.tax_amount

    def test_rounding_remainder_never_loses_a_cent_of_discount(self, user, client_obj):
        invoice = make(user, client_obj, [('10', '10'), ('10', '5'), ('10', '0')], discount_amount=Decimal('0.01'))

        assert sum(r['taxable'] for r in invoice.tax_breakdown()) == Decimal('29.99')

    def test_an_explicit_zero_rate_line_is_exempt_even_with_an_invoice_rate(self, user, client_obj):
        invoice = make(user, client_obj, [('100', None), ('100', '0')], tax_rate=Decimal('10'))

        assert invoice.tax_amount == Decimal('10.00')

    def test_percent_discount_is_stored_as_money(self, user, client_obj):
        invoice = make(user, client_obj, [('200', None)], discount_percent=Decimal('12.5'), tax_rate=Decimal('10'))

        assert invoice.discount_amount == Decimal('25.00')
        assert invoice.total == Decimal('192.50')  # (200 - 25) + 17.50


@pytest.mark.django_db
class TestApi:
    def payload(self, client, **extra):
        return {
            'client': str(client.id),
            'items': [
                {'description': 'Design', 'quantity': 1, 'rate': 100, 'tax_rate': 20},
                {'description': 'Books', 'quantity': 1, 'rate': 100, 'tax_rate': None},
            ],
            **extra,
        }

    def test_line_rates_round_trip_and_the_breakdown_is_returned(self, api_client, client_obj):
        response = api_client.post('/api/invoices/', self.payload(client_obj, tax_rate=5), format='json')
        detail = api_client.get(f"/api/invoices/{response.data['id']}/").data

        assert [i['tax_rate'] for i in detail['items']] == ['20.00', None]
        assert [(r['rate'], r['tax']) for r in detail['tax_breakdown']] == [('20.00', '20.00'), ('5.00', '5.00')]
        assert detail['tax_amount'] == '25.00'

    def test_both_discount_kinds_at_once_is_a_400(self, api_client, client_obj):
        response = api_client.post(
            '/api/invoices/', self.payload(client_obj, discount_amount=5, discount_percent=10), format='json'
        )

        assert response.status_code == 400 and 'discount_percent' in response.data

    def test_switching_to_a_fixed_discount_clears_the_percentage(self, api_client, client_obj):
        created = api_client.post('/api/invoices/', self.payload(client_obj, discount_percent=10), format='json')

        api_client.patch(f"/api/invoices/{created.data['id']}/", {'discount_amount': 7}, format='json')

        invoice = Invoice.objects.get(pk=created.data['id'])
        assert (invoice.discount_percent, invoice.discount_amount) == (0, Decimal('7.00'))

    def test_a_line_rate_over_100_is_refused(self, api_client, client_obj):
        bad = {'client': str(client_obj.id), 'items': [{'description': 'x', 'quantity': 1, 'rate': 1, 'tax_rate': 120}]}

        assert api_client.post('/api/invoices/', bad, format='json').status_code == 400

    def test_duplicate_keeps_line_rates_and_percentage(self, api_client, user, client_obj):
        original = make(user, client_obj, [('100', '20'), ('100', None)], discount_percent=Decimal('10'))

        copy = api_client.post(f'/api/invoices/{original.id}/duplicate/').data

        assert copy['total'] == str(original.total)
        assert [i['tax_rate'] for i in copy['items']] == ['20.00', None]


@pytest.mark.django_db
def test_the_pdf_prints_one_tax_row_per_rate(user, client_obj):
    invoice = make(user, client_obj, [('100', '20'), ('100', '5')])

    html = render(invoice)

    assert 'VAT (20%)' in html and 'VAT (5%)' in html


@pytest.mark.django_db
def test_lines_come_back_in_the_order_they_were_written(api_client, client_obj):
    """The UUID primary key used to shuffle them (BUG-20)."""
    lines = [{'description': f'line {n}', 'quantity': 1, 'rate': 1} for n in range(8)]
    created = api_client.post('/api/invoices/', {'client': str(client_obj.id), 'items': lines}, format='json')

    detail = api_client.get(f"/api/invoices/{created.data['id']}/").data

    assert [i['description'] for i in detail['items']] == [f'line {n}' for n in range(8)]
