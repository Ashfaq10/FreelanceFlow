"""The one place invoice-like money is computed, shared by invoices and quotes (DATA-3, FEAT-4).

All `Decimal`, half-up to the cent. The SPA mirrors this in `utils/money.js` and a parity check keeps them equal.
"""

from decimal import ROUND_HALF_UP, Decimal

CENTS = Decimal('0.01')


def to_cents(amount):
    """Round money half-up to the cent; Django would otherwise round half-even when saving."""
    return Decimal(str(amount)).quantize(CENTS, rounding=ROUND_HALF_UP)


def tax_breakdown(items, default_rate, discount):
    """Tax per effective rate, with the discount shared across rates by subtotal.

    `items` need `.line_total` and `.tax_rate` (None = use `default_rate`). The last (lowest) rate absorbs the
    rounding remainder, so the shares always add up to the discount.
    """
    default_rate = Decimal(str(default_rate or 0))
    groups = {}
    for item in sorted(items, key=lambda item: -(default_rate if item.tax_rate is None else item.tax_rate)):
        rate = default_rate if item.tax_rate is None else Decimal(str(item.tax_rate))
        groups[rate] = groups.get(rate, Decimal('0')) + item.line_total

    subtotal = sum(groups.values(), Decimal('0'))
    rows, shared = [], Decimal('0')
    for position, (rate, group_subtotal) in enumerate(groups.items()):
        if position == len(groups) - 1:
            share = discount - shared
        else:
            share = to_cents(discount * group_subtotal / subtotal) if subtotal else Decimal('0')
            shared += share
        taxable = group_subtotal - share
        rows.append({'rate': rate, 'taxable': taxable, 'tax': to_cents(taxable * rate / Decimal('100'))})
    return rows


def calculate(items, default_rate, discount_amount, discount_percent):
    """Subtotal, the discount in money, tax and total for a set of lines."""
    subtotal = to_cents(sum((item.line_total for item in items), Decimal('0')))
    if discount_percent:
        discount_amount = to_cents(subtotal * discount_percent / Decimal('100'))
    discount = min(to_cents(discount_amount or 0), subtotal)
    breakdown = tax_breakdown(items, default_rate, discount)
    tax = sum((row['tax'] for row in breakdown), Decimal('0'))
    return {
        'subtotal': subtotal,
        'discount_amount': to_cents(discount_amount or 0),
        'discount': discount,
        'tax_amount': tax,
        'total': subtotal - discount + tax,
        'breakdown': breakdown,
    }
