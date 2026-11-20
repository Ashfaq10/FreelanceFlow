from pathlib import Path

from django.conf import settings
from django.template.loader import render_to_string

import weasyprint

from apps.invoices.utils import PDF_COLORS, _logo_data_uri, get_currency_symbol


def generate_quote_pdf(quote):
    """One-page proposal: lines, per-rate tax, total, validity, and an accent colour (FEAT-4)."""
    user = quote.user
    context = {
        'quote': quote,
        'client': quote.client,
        'items': quote.items.all(),
        'tax_rows': [row for row in quote.tax_breakdown() if row['rate'] > 0],
        'logo_uri': _logo_data_uri(user),
        'business_name': user.get_display_name(),
        'currency_symbol': get_currency_symbol(quote.currency),
        'accent': PDF_COLORS['indigo'],
    }
    html = render_to_string('quotes/quote_pdf.html', context)
    return weasyprint.HTML(string=html, base_url=str(Path(settings.BASE_DIR))).write_pdf()
