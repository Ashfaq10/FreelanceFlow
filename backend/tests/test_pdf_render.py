"""What the rendered invoice HTML says (BUG-16). WeasyPrint is not involved: the template is the contract."""

from django.core.files.base import ContentFile
from django.template.loader import render_to_string

import pytest

from apps.invoices.utils import PDF_COLORS, PDF_TEMPLATES, build_pdf_context

from .factories import InvoiceFactory, InvoiceItemFactory


def render(invoice):
    return render_to_string('invoices/invoice_pdf.html', build_pdf_context(invoice))


@pytest.fixture
def invoice(user, client_obj):
    # The factory fills `notes`; these tests are about the text shown when the user wrote none.
    invoice = InvoiceFactory(user=user, client=client_obj, notes='')
    InvoiceItemFactory(invoice=invoice)
    invoice.save()
    return invoice


@pytest.mark.django_db
class TestInvoicePDFTemplate:
    def test_due_date_is_labelled_due_date(self, invoice):
        html = render(invoice)

        assert 'Due Date' in html
        assert 'Payment Date' not in html

    def test_unpaid_invoice_is_not_called_a_receipt(self, invoice):
        assert invoice.status == 'draft'

        assert 'official receipt' not in render(invoice)

    def test_paid_invoice_is_a_receipt(self, invoice):
        invoice.mark_as_sent()
        invoice.mark_as_paid()

        assert 'official receipt' in render(invoice)

    def test_own_notes_win_over_the_default_text(self, invoice):
        invoice.notes = 'Pay in instalments as agreed.'

        html = render(invoice)

        assert 'Pay in instalments as agreed.' in html
        assert 'official receipt' not in html

    def test_chosen_colour_reaches_the_document(self, invoice):
        invoice.pdf_color = 'emerald'

        html = render(invoice)

        assert PDF_COLORS['emerald']['primary'] in html
        assert PDF_COLORS['indigo']['primary'] not in html

    def test_unknown_colour_falls_back_to_the_default(self, invoice):
        invoice.pdf_color = 'chartreuse'

        assert PDF_COLORS['indigo']['primary'] in render(invoice)

    @pytest.mark.parametrize('layout', PDF_TEMPLATES)
    def test_chosen_layout_reaches_the_document(self, invoice, layout):
        invoice.pdf_template = layout

        assert f'class="layout-{layout}"' in render(invoice)

    def test_unknown_layout_falls_back_to_professional(self, invoice):
        invoice.pdf_template = 'gothic'

        assert 'class="layout-professional"' in render(invoice)

    def test_the_page_edge_bar_belongs_to_bold_only(self, invoice):
        invoice.pdf_template = 'professional'
        assert '@page { border-left' not in render(invoice)

        invoice.pdf_template = 'bold'
        assert '@page { border-left' in render(invoice)


@pytest.mark.django_db
class TestPDFColorAPI:
    def test_colour_can_be_changed_after_the_invoice_is_sent(self, api_client, invoice):
        invoice.mark_as_sent()

        response = api_client.patch(f'/api/invoices/{invoice.id}/', {'pdf_color': 'rose'}, format='json')

        assert response.status_code == 200
        invoice.refresh_from_db()
        assert invoice.pdf_color == 'rose'

    def test_other_fields_still_need_a_draft(self, api_client, invoice):
        invoice.mark_as_sent()

        response = api_client.patch(f'/api/invoices/{invoice.id}/', {'notes': 'nope'}, format='json')

        assert response.status_code == 400

    def test_unknown_colour_is_rejected(self, api_client, invoice):
        response = api_client.patch(f'/api/invoices/{invoice.id}/', {'pdf_color': 'chartreuse'}, format='json')

        assert response.status_code == 400


@pytest.mark.django_db
class TestPDFTemplateAPI:
    def test_layout_can_be_changed_after_the_invoice_is_sent(self, api_client, invoice):
        invoice.mark_as_sent()

        response = api_client.patch(f'/api/invoices/{invoice.id}/', {'pdf_template': 'modern'}, format='json')

        assert response.status_code == 200
        assert response.data['pdf_template'] == 'modern'

    def test_unknown_layout_is_rejected(self, api_client, invoice):
        response = api_client.patch(f'/api/invoices/{invoice.id}/', {'pdf_template': 'gothic'}, format='json')

        assert response.status_code == 400

    def test_changing_the_layout_drops_the_stored_pdf(self, api_client, invoice):
        invoice.pdf_file.save('old.pdf', ContentFile(b'%PDF-old'))

        api_client.patch(f'/api/invoices/{invoice.id}/', {'pdf_template': 'minimal'}, format='json')

        invoice.refresh_from_db()
        assert not invoice.pdf_file
