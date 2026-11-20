import json
from unittest.mock import patch

from django.core import signing
from django.core.files.base import ContentFile

import pytest
from rest_framework.test import APIClient

from apps.accounts import verification
from apps.accounts.models import User
from apps.clients.models import Client
from apps.invoices.models import Invoice
from apps.payments.services import record_payment

from .factories import ClientFactory, InvoiceFactory, InvoiceItemFactory, TimeLogFactory, UserFactory

PASSWORD = 'tr0ubled-gardener'


@pytest.fixture
def owner():
    return UserFactory(password=PASSWORD, business_name='Acme Studio', phone='+1-555-000-0000')


@pytest.fixture
def me(owner):
    client = APIClient()
    client.force_authenticate(user=owner)
    return client


def invoice_for(owner, **fields):
    client = ClientFactory(user=owner)
    invoice = InvoiceFactory(user=owner, client=client, **fields)
    InvoiceItemFactory(invoice=invoice, quantity=1, unit_price=100)
    invoice.save()
    return invoice


@pytest.mark.django_db
class TestExport:
    def test_everything_i_own_and_nothing_else(self, me, owner):
        sent = invoice_for(owner)
        sent.mark_as_sent()
        record_payment(sent, 40)
        TimeLogFactory(user=owner, client=sent.client, description='mine')
        stranger = UserFactory()
        invoice_for(stranger)
        TimeLogFactory(user=stranger, description='theirs')

        response = me.get('/api/auth/export/')
        data = json.loads(response.content)

        assert 'attachment' in response['Content-Disposition']
        assert data['profile']['email'] == owner.email
        assert [i['invoice_number'] for i in data['invoices']] == [sent.invoice_number]
        assert data['invoices'][0]['payments'][0]['amount'] == '40.00'
        assert [t['description'] for t in data['time_logs']] == ['mine']
        assert len(data['clients']) == 1

    def test_anonymous_callers_are_refused(self):
        assert APIClient().get('/api/auth/export/').status_code == 401


@pytest.mark.django_db
class TestDeletion:
    def test_the_password_is_required(self, me, owner):
        assert me.post('/api/auth/delete/', {'password': 'wrong'}, format='json').status_code == 400
        owner.refresh_from_db()
        assert owner.is_active

    def test_personal_data_goes_but_the_books_stay(self, me, owner):
        paid = invoice_for(owner)
        paid.mark_as_sent()
        record_payment(paid, 100)
        draft = invoice_for(owner)
        lonely_client = ClientFactory(user=owner)
        TimeLogFactory(user=owner, client=paid.client)
        paid.pdf_file.save('x.pdf', ContentFile(b'%PDF'))
        owner.logo.save('l.png', ContentFile(b'png'))
        stored_pdf = paid.pdf_file.name

        response = me.post('/api/auth/delete/', {'password': PASSWORD}, format='json')

        assert response.status_code == 200
        owner.refresh_from_db()
        assert not owner.is_active and not owner.has_usable_password() and not owner.logo
        assert owner.email.endswith('@deleted.invalid')
        assert (owner.full_name, owner.phone, owner.bank_details) == ('', '', '')
        assert owner.business_name == 'Deleted account'
        # the books
        assert Invoice.objects.filter(pk=paid.pk).exists() and paid.payments.count() == 1
        paid.refresh_from_db()
        assert not paid.pdf_file and stored_pdf
        # the rest
        assert not Invoice.objects.filter(pk=draft.pk).exists()
        assert not Client.objects.filter(pk=lonely_client.pk).exists()
        assert Client.objects.filter(pk=paid.client_id).exists()
        assert not owner.time_logs.exists()

    def test_the_session_ends_and_login_is_impossible(self, owner):
        browser = APIClient()
        browser.post('/api/auth/login/', {'email': owner.email, 'password': PASSWORD}, format='json')
        browser.post('/api/auth/delete/', {'password': PASSWORD}, format='json')

        assert browser.get('/api/auth/user/').status_code == 401
        email = owner.email
        owner.refresh_from_db()
        assert (
            browser.post('/api/auth/login/', {'email': email, 'password': PASSWORD}, format='json').status_code == 401
        )

    def test_the_retained_pay_link_shows_the_closed_account(self, me, owner):
        sent = invoice_for(owner)
        sent.mark_as_sent()
        me.post('/api/auth/delete/', {'password': PASSWORD}, format='json')

        page = APIClient().get(f'/api/public/invoices/{sent.public_token}/')

        assert page.status_code == 200 and page.data['business_name'] == 'Deleted account'


@pytest.mark.django_db
class TestVerification:
    def signup(self, mailoutbox):
        browser = APIClient()
        browser.post(
            '/api/auth/signup/',
            {'email': 'new@example.com', 'password1': PASSWORD, 'password2': PASSWORD},
            format='json',
        )
        return browser, mailoutbox[-1].body.split('/verify-email/')[1].split('"')[0].split('<')[0].strip()

    def test_signup_mails_a_link_that_confirms_the_address(self, mailoutbox):
        browser, token = self.signup(mailoutbox)
        assert browser.get('/api/auth/user/').data['email_verified'] is False

        response = APIClient().post('/api/auth/verify-email/', {'token': token}, format='json')

        assert response.status_code == 200
        assert User.objects.get(email='new@example.com').email_verified

    @pytest.mark.parametrize('mangle', ['tamper', 'expired', 'other_address'])
    def test_bad_tokens_do_nothing(self, mailoutbox, mangle):
        _, token = self.signup(mailoutbox)
        user = User.objects.get(email='new@example.com')
        age = verification.MAX_AGE
        if mangle == 'tamper':
            token = token[:-2] + 'xx'
        elif mangle == 'expired':
            age = -1
        else:
            token = signing.dumps({'uid': str(user.pk), 'email': 'someone-else@example.com'}, salt=verification.SALT)

        with patch.object(verification, 'MAX_AGE', age):
            response = APIClient().post('/api/auth/verify-email/', {'token': token}, format='json')

        user.refresh_from_db()
        assert response.status_code == 400 and not user.email_verified

    def test_an_unverified_user_cannot_send_invoices(self, owner, me):
        owner.email_verified = False
        owner.save()
        invoice = invoice_for(owner)

        response = me.post(f'/api/invoices/{invoice.id}/send/')

        assert response.status_code == 403

    def test_the_gate_can_be_switched_off(self, owner, me, settings):
        owner.email_verified = False
        owner.save()
        settings.EMAIL_VERIFICATION_REQUIRED = False
        invoice = invoice_for(owner)

        assert me.post(f'/api/invoices/{invoice.id}/send/').status_code == 200

    def test_resend_sends_one_mail_and_is_throttled(self, owner, me, mailoutbox):
        owner.email_verified = False
        owner.save()

        codes = [me.post('/api/auth/verify-email/resend/').status_code for _ in range(11)]

        assert codes[:10] == [200] * 10 and codes[10] == 429
        assert len(mailoutbox) == 10

    def test_a_mail_outage_does_not_break_signup(self):
        with patch('apps.accounts.verification.EmailMessage.send', side_effect=OSError('smtp down')):
            response = APIClient().post(
                '/api/auth/signup/',
                {'email': 'new@example.com', 'password1': PASSWORD, 'password2': PASSWORD},
                format='json',
            )

        assert response.status_code == 201


@pytest.mark.django_db
class TestErasureWithQuotesAndSchedules:
    def test_quotes_and_schedules_do_not_block_or_survive_erasure(self, me, owner):
        from apps.quotes.models import Quote, QuoteItem
        from apps.recurring.models import RecurringInvoice

        client = ClientFactory(user=owner)
        quote = Quote.objects.create(user=owner, client=client, status='sent')
        QuoteItem.objects.create(quote=quote, description='x', unit_price=1)
        RecurringInvoice.objects.create(user=owner, client=client, next_run='2026-12-01')

        response = me.post('/api/auth/delete/', {'password': PASSWORD}, format='json')

        assert response.status_code == 200
        assert not Quote.objects.filter(user=owner).exists()
        assert not RecurringInvoice.objects.filter(user=owner).exists()
        assert APIClient().get(f'/api/public/quotes/{quote.public_token}/').status_code == 404

    def test_the_export_includes_quotes_and_schedules(self, me, owner):
        from apps.quotes.models import Quote
        from apps.recurring.models import RecurringInvoice

        client = ClientFactory(user=owner)
        Quote.objects.create(user=owner, client=client)
        RecurringInvoice.objects.create(user=owner, client=client, next_run='2026-12-01')

        data = json.loads(me.get('/api/auth/export/').content)

        assert len(data['quotes']) == 1 and len(data['recurring_invoices']) == 1
