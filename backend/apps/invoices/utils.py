import os
from pathlib import Path

import weasyprint
from django.conf import settings
from django.template.loader import render_to_string

DEFAULT_INVOICE_TERMS = [
    'All amounts are quoted in the currency shown on this invoice.',
    'VAT is applied at the rate shown where applicable.',
    'Please retain this invoice for your records for at least five years for tax and audit purposes.',
    'Payment is due by the date indicated unless otherwise agreed in writing.',
    'For questions regarding this invoice, contact the business listed in the FROM section.',
]


def get_currency_symbol(currency_code):
    symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'CAD': 'C$',
        'AUD': 'A$',
        'INR': '₹',
        'BDT': 'BDT ',
    }
    return symbols.get(currency_code, f'{currency_code} ')


def format_currency(amount, currency_code):
    symbol = get_currency_symbol(currency_code)
    try:
        value = float(amount)
    except (TypeError, ValueError):
        value = 0
    return f'{symbol}{value:,.2f}'


def _logo_file_uri(user):
    if not user.logo:
        return None
    try:
        logo_path = Path(user.logo.path)
        if logo_path.is_file():
            return logo_path.as_uri()
    except (ValueError, AttributeError):
        pass
    return None


def _payment_context(invoice):
    from django.core.exceptions import ObjectDoesNotExist

    try:
        payment = invoice.payment
    except ObjectDoesNotExist:
        payment = None
    if not payment:
        return {
            'has_payment': False,
            'payment_date': None,
            'payment_method': '—',
            'payment_gateway': '—',
            'transaction_id': '—',
        }

    txn = payment.stripe_payment_id or f'MANUAL-{str(payment.id).replace("-", "").upper()[:16]}'
    gateway = 'STRIPE' if payment.method == 'stripe' else payment.method.upper()
    return {
        'has_payment': True,
        'payment_date': payment.paid_on,
        'payment_method': payment.method,
        'payment_method_label': payment.get_method_display(),
        'payment_gateway': gateway,
        'transaction_id': txn,
    }


def _status_display(status):
    labels = {
        'draft': ('DRAFT', '#6B7280'),
        'sent': ('UNPAID', '#F97316'),
        'overdue': ('OVERDUE', '#DC2626'),
        'paid': ('PAID', '#059669'),
        'cancelled': ('CANCELLED', '#6B7280'),
    }
    return labels.get(status, ('UNPAID', '#F97316'))


def _terms_list(user):
    if user.invoice_terms and user.invoice_terms.strip():
        lines = [ln.strip() for ln in user.invoice_terms.strip().splitlines() if ln.strip()]
        return lines
    return DEFAULT_INVOICE_TERMS


def _format_datetime_local(dt, timezone_str=None):
    """Format a datetime to a local-time string, optionally converting timezone."""
    if dt is None:
        return '—'
    if timezone_str:
        try:
            from zoneinfo import ZoneInfo
            tz = ZoneInfo(timezone_str)
            dt = dt.astimezone(tz)
        except (TypeError, ValueError, KeyError):
            pass
    return dt.strftime("%b %d, %Y, %I:%M:%S %p")


def build_pdf_context(invoice, template='professional', color='indigo', timezone_str=None):
    user = invoice.user
    client = invoice.client
    currency = user.currency or 'USD'
    status_label, status_color = _status_display(invoice.status)
    payment_ctx = _payment_context(invoice)

    business_name = user.business_name or user.full_name or user.email
    from_name = business_name

    return {
        'invoice': invoice,
        'items': invoice.items.all(),
        'user': user,
        'client': client,
        'template': template,
        'logo_uri': _logo_file_uri(user),
        'currency_code': currency,
        'currency_symbol': get_currency_symbol(currency),
        'business_name': business_name,
        'from_name': from_name,
        'status_label': status_label,
        'status_color': status_color,
        'payment': payment_ctx,
        'bank_lines': _bank_lines(user.bank_details),
        'terms_list': _terms_list(user),
        'discount': invoice.discount_amount or 0,
        'notes_text': invoice.notes or (
            'Thank you for your payment. This invoice serves as your official receipt. '
            'Please retain it for your records and for any tax, audit, or support-related requirements.'
        ),
        'issue_date_formatted': _format_datetime_local(invoice.issue_date, timezone_str),
        'due_date_formatted': _format_datetime_local(invoice.due_date, timezone_str),
    }


def _bank_lines(bank_details):
    if not bank_details or not bank_details.strip():
        return []
    rows = []
    for ln in bank_details.strip().splitlines():
        ln = ln.strip()
        if not ln:
            continue
        if ':' in ln:
            label, _, value = ln.partition(':')
            rows.append({'label': label.strip(), 'value': value.strip()})
        else:
            rows.append({'label': None, 'value': ln})
    return rows


def generate_pdf(invoice, template='professional', color='indigo', timezone_str=None):
    """Generate PDF bytes from invoice using WeasyPrint."""
    context = build_pdf_context(invoice, template=template, color=color, timezone_str=timezone_str)

    html_string = render_to_string('invoices/invoice_pdf.html', context)

    base_url = str(Path(settings.BASE_DIR))
    pdf_bytes = weasyprint.HTML(string=html_string, base_url=base_url).write_pdf()

    return pdf_bytes
