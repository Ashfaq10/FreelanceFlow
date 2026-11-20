import pytest

from apps.invoices.models import Invoice

from .factories import ClientFactory, UserFactory


def new_invoice(user):
    return Invoice.objects.create(user=user, client=ClientFactory(user=user))


@pytest.mark.django_db
class TestInvoicePrefix:
    def test_new_invoices_use_the_users_prefix(self):
        user = UserFactory(invoice_prefix='ACME')

        assert new_invoice(user).invoice_number.startswith('ACME-')

    def test_each_prefix_counts_from_one_and_old_numbers_stay(self):
        user = UserFactory()
        first = new_invoice(user)
        new_invoice(user)
        user.invoice_prefix = 'ACME'
        user.save()

        switched = new_invoice(user)

        assert switched.invoice_number.endswith('-001')
        first.refresh_from_db()
        assert first.invoice_number.startswith('INV-')

    def test_prefix_is_saved_upper_case_through_the_api(self, api_client, user):
        response = api_client.patch('/api/auth/user/', {'invoice_prefix': 'acme7'}, format='json')

        assert response.status_code == 200
        assert response.data['invoice_prefix'] == 'ACME7'

    @pytest.mark.parametrize('bad', ['AC-ME', 'has space', '', 'TOOLONGPREFIX'])
    def test_a_prefix_that_would_break_numbering_is_refused(self, api_client, bad):
        response = api_client.patch('/api/auth/user/', {'invoice_prefix': bad}, format='json')

        assert response.status_code == 400
