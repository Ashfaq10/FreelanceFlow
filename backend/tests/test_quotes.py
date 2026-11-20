from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.utils import timezone

import pytest
from rest_framework.test import APIClient

from apps.invoices.models import Invoice
from apps.quotes.models import Quote, QuoteItem
from apps.quotes.services import convert_quote
from apps.quotes.tasks import send_quote

from .factories import ClientFactory, UserFactory


def payload(client, **extra):
    return {
        'client': str(client.id),
        'items': [
            {'description': 'Design', 'quantity': 1, 'rate': 100, 'tax_rate': 20},
            {'description': 'Books', 'quantity': 2, 'rate': 50, 'tax_rate': None},
        ],
        'tax_rate': 5,
        **extra,
    }


@pytest.fixture
def quote(api_client, client_obj):
    created = api_client.post('/api/quotes/', payload(client_obj, discount_amount=20), format='json')
    assert created.status_code == 201, created.data
    return Quote.objects.get(pk=created.data['id'])


@pytest.mark.django_db
class TestCrud:
    def test_it_totals_like_an_invoice(self, api_client, client_obj, quote):
        # 100 @20% + 100 @5%, discount 20 shared 10/10: tax 18 + 4.50
        assert (quote.subtotal, quote.tax_amount, quote.total) == (
            Decimal('200.00'),
            Decimal('22.50'),
            Decimal('202.50'),
        )
        detail = api_client.get(f'/api/quotes/{quote.id}/').data
        assert [r['rate'] for r in detail['tax_breakdown']] == ['20.00', '5.00']
        assert [line['description'] for line in detail['lines']] == ['Design', 'Books']

    def test_numbers_count_up_per_user(self, api_client, client_obj, quote):
        second = api_client.post('/api/quotes/', payload(client_obj), format='json')
        assert quote.number.endswith('-001') and second.data['number'].endswith('-002')

    def test_only_drafts_can_be_edited_or_deleted(self, api_client, quote):
        edited = api_client.patch(f'/api/quotes/{quote.id}/', {'notes': 'hello'}, format='json')
        assert edited.status_code == 200
        quote.status = 'sent'
        quote.save(update_fields=['status'])

        assert api_client.patch(f'/api/quotes/{quote.id}/', {'notes': 'x'}, format='json').status_code == 400
        assert api_client.delete(f'/api/quotes/{quote.id}/').status_code == 400

    def test_replacing_lines_recomputes_the_total(self, api_client, quote):
        api_client.patch(
            f'/api/quotes/{quote.id}/',
            {'discount_amount': 0, 'items': [{'description': 'Only', 'quantity': 1, 'rate': 10}]},
            format='json',
        )
        quote.refresh_from_db()
        assert quote.total == Decimal('10.50') and quote.items.count() == 1

    def test_another_users_client_and_quotes_are_off_limits(self, api_client, quote):
        foreign = ClientFactory(user=UserFactory())
        assert api_client.post('/api/quotes/', payload(foreign), format='json').status_code == 400
        stranger = APIClient()
        stranger.force_authenticate(user=UserFactory())
        assert stranger.get(f'/api/quotes/{quote.id}/').status_code == 404
        assert stranger.post(f'/api/quotes/{quote.id}/convert/').status_code == 404

    def test_both_discount_kinds_are_refused(self, api_client, client_obj):
        r = api_client.post('/api/quotes/', payload(client_obj, discount_amount=5, discount_percent=10), format='json')
        assert r.status_code == 400


@pytest.mark.django_db
class TestSending:
    def test_it_is_sent_only_once_the_email_left(self, quote, mailoutbox):
        with patch('apps.quotes.pdf.generate_quote_pdf', return_value=b'PDF'):
            with patch('apps.quotes.tasks.EmailMessage.send', side_effect=OSError('smtp down')), pytest.raises(OSError):
                send_quote(str(quote.id))
            quote.refresh_from_db()
            assert quote.status == 'draft'

            send_quote(str(quote.id))

        quote.refresh_from_db()
        assert quote.status == 'sent' and len(mailoutbox) == 1
        assert f'/quote/{quote.public_token}' in mailoutbox[0].body

    def test_the_endpoint_queues_and_respects_the_gates(self, api_client, quote, user, settings):
        with patch('apps.quotes.api_views.send_quote.delay') as queued:
            assert api_client.post(f'/api/quotes/{quote.id}/send/').status_code == 200
        queued.assert_called_once()

        with patch('apps.quotes.api_views.broker_reachable', return_value=False):
            assert api_client.post(f'/api/quotes/{quote.id}/send/').status_code == 503

        user.email_verified = False
        user.save()
        assert api_client.post(f'/api/quotes/{quote.id}/send/').status_code == 403


@pytest.mark.django_db
class TestClientPage:
    def open(self, quote):
        quote.mark_as_sent()

    def test_drafts_are_invisible(self, quote):
        assert APIClient().get(f'/api/public/quotes/{quote.public_token}/').status_code == 404

    def test_the_client_can_read_and_accept_once(self, quote):
        self.open(quote)
        anon = APIClient()

        page = anon.get(f'/api/public/quotes/{quote.public_token}/').data
        assert page['total'] == '202.50' and page['client_name'] == quote.client.display_name
        assert anon.post(f'/api/public/quotes/{quote.public_token}/accept/').status_code == 200
        quote.refresh_from_db()
        assert quote.status == 'accepted' and quote.responded_at
        assert anon.post(f'/api/public/quotes/{quote.public_token}/decline/').status_code == 400

    def test_declining_is_recorded(self, quote):
        self.open(quote)
        APIClient().post(f'/api/public/quotes/{quote.public_token}/decline/')
        quote.refresh_from_db()
        assert quote.status == 'declined'

    def test_an_expired_quote_cannot_be_accepted(self, quote):
        self.open(quote)
        quote.valid_until = timezone.localdate() - timedelta(days=1)
        quote.save(update_fields=['valid_until'])

        response = APIClient().post(f'/api/public/quotes/{quote.public_token}/accept/')

        assert response.status_code == 400
        assert APIClient().get(f'/api/public/quotes/{quote.public_token}/').data['is_expired'] is True

    def test_the_client_can_download_the_pdf(self, quote):
        self.open(quote)
        pdf = APIClient().get(f'/api/public/quotes/{quote.public_token}/pdf/')
        assert pdf.status_code == 200 and pdf.content.startswith(b'%PDF')


@pytest.mark.django_db
class TestConvert:
    def test_it_makes_a_draft_invoice_with_everything_copied(self, api_client, quote):
        response = api_client.post(f'/api/quotes/{quote.id}/convert/')

        assert response.status_code == 201
        invoice = Invoice.objects.get(pk=response.data['id'])
        assert invoice.status == 'draft'
        assert (invoice.subtotal, invoice.tax_amount, invoice.total) == (quote.subtotal, quote.tax_amount, quote.total)
        assert [i.description for i in invoice.items.all()] == ['Design', 'Books']
        assert [i.tax_rate for i in invoice.items.all()] == [Decimal('20.00'), None]
        assert invoice.events.get(kind='created').detail == f'From quote {quote.number}'
        quote.refresh_from_db()
        assert quote.status == 'converted' and quote.invoice_id == invoice.id

    def test_a_percentage_discount_survives_the_trip(self, api_client, client_obj):
        created = api_client.post('/api/quotes/', payload(client_obj, discount_percent=10), format='json')
        quote = Quote.objects.get(pk=created.data['id'])

        invoice = convert_quote(quote)

        assert invoice.discount_percent == Decimal('10.00') and invoice.total == quote.total

    def test_it_converts_once_and_never_a_declined_quote(self, api_client, quote):
        api_client.post(f'/api/quotes/{quote.id}/convert/')
        assert api_client.post(f'/api/quotes/{quote.id}/convert/').status_code == 400
        assert Invoice.objects.filter(source_quotes=quote).count() == 1

        other = Quote.objects.create(user=quote.user, client=quote.client, status='declined')
        QuoteItem.objects.create(quote=other, description='x', unit_price=1)
        assert api_client.post(f'/api/quotes/{other.id}/convert/').status_code == 400


@pytest.mark.django_db
def test_the_owner_can_download_the_quote_pdf(api_client, quote):
    pdf = api_client.get(f'/api/quotes/{quote.id}/pdf/')
    assert pdf.status_code == 200 and pdf.content.startswith(b'%PDF')
