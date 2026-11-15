"""Invoice status only moves through the model's state machine (DATA-2)."""
import pytest
from django.core.exceptions import ValidationError

from apps.invoices.models import InvoiceItem

from .factories import InvoiceFactory


@pytest.fixture
def sent_invoice(db, user, client_obj):
    return InvoiceFactory(user=user, client=client_obj, status='sent')


@pytest.mark.django_db
class TestModelTransitions:
    def test_draft_can_be_sent(self, invoice):
        invoice.mark_as_sent()

        assert invoice.status == 'sent'
        assert invoice.sent_at is not None

    def test_paid_invoice_cannot_be_sent(self, user, client_obj):
        paid = InvoiceFactory(user=user, client=client_obj, status='paid')

        with pytest.raises(ValidationError):
            paid.mark_as_sent()

        paid.refresh_from_db()
        assert paid.status == 'paid'

    def test_draft_cannot_be_marked_paid(self, invoice):
        with pytest.raises(ValidationError):
            invoice.mark_as_paid()

    def test_overdue_can_be_marked_paid(self, user, client_obj):
        overdue = InvoiceFactory(user=user, client=client_obj, status='overdue')

        overdue.mark_as_paid()

        assert overdue.status == 'paid'

    def test_cancelled_invoice_cannot_be_paid(self, user, client_obj):
        cancelled = InvoiceFactory(user=user, client=client_obj, status='cancelled')

        with pytest.raises(ValidationError):
            cancelled.mark_as_paid()

    def test_paid_invoice_cannot_be_cancelled(self, user, client_obj):
        paid = InvoiceFactory(user=user, client=client_obj, status='paid')

        with pytest.raises(ValidationError):
            paid.cancel()


@pytest.mark.django_db
class TestStatusThroughTheAPI:
    def test_write_serializer_ignores_status(self, api_client, client_obj):
        response = api_client.post(
            '/api/invoices/',
            {
                'client': str(client_obj.id),
                'status': 'paid',
                'items': [{'description': 'Work', 'quantity': 1, 'rate': 10}],
            },
            format='json',
        )

        assert response.status_code == 201
        assert response.data['status'] == 'draft'

    def test_update_cannot_set_status(self, api_client, invoice):
        response = api_client.patch(f'/api/invoices/{invoice.id}/', {'status': 'paid'}, format='json')

        assert response.status_code == 200
        invoice.refresh_from_db()
        assert invoice.status == 'draft'

    def test_cancel_endpoint_cancels_a_draft(self, api_client, invoice):
        response = api_client.post(f'/api/invoices/{invoice.id}/cancel/')

        assert response.status_code == 200
        invoice.refresh_from_db()
        assert invoice.status == 'cancelled'

    def test_cancel_endpoint_rejects_a_paid_invoice(self, api_client, user, client_obj):
        paid = InvoiceFactory(user=user, client=client_obj, status='paid')

        response = api_client.post(f'/api/invoices/{paid.id}/cancel/')

        assert response.status_code == 400
        paid.refresh_from_db()
        assert paid.status == 'paid'

    def test_cancel_endpoint_is_scoped_to_the_owner(self, api_client):
        someone_elses = InvoiceFactory()

        assert api_client.post(f'/api/invoices/{someone_elses.id}/cancel/').status_code == 404

    def test_mark_paid_rejects_a_draft(self, api_client, invoice):
        InvoiceItem.objects.create(invoice=invoice, description='Work', quantity=1, unit_price=10)

        response = api_client.post(f'/api/invoices/{invoice.id}/mark-paid/')

        assert response.status_code == 400
        invoice.refresh_from_db()
        assert invoice.status == 'draft'

    def test_mark_paid_works_on_a_sent_invoice(self, api_client, sent_invoice):
        InvoiceItem.objects.create(invoice=sent_invoice, description='Work', quantity=1, unit_price=10)

        response = api_client.post(f'/api/invoices/{sent_invoice.id}/mark-paid/')

        assert response.status_code == 200
        sent_invoice.refresh_from_db()
        assert sent_invoice.status == 'paid'
