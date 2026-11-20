from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.utils import timezone

import pytest
from rest_framework.test import APIClient

from apps.invoices.models import Invoice
from apps.recurring.models import RecurringInvoice, RecurringItem
from apps.recurring.services import advance, run_schedule
from apps.recurring.tasks import generate_recurring_invoices

from .factories import ClientFactory, UserFactory

TODAY = date(2026, 11, 20)


def schedule_for(user, client, **fields):
    fields.setdefault('start_date', TODAY)
    schedule = RecurringInvoice.objects.create(user=user, client=client, next_run=fields['start_date'], **fields)
    RecurringItem.objects.create(schedule=schedule, description='Retainer', quantity=1, unit_price=500, position=0)
    RecurringItem.objects.create(
        schedule=schedule, description='Hosting', quantity=2, unit_price=10, tax_rate=Decimal('20'), position=1
    )
    return schedule


@pytest.mark.django_db
class TestRun:
    def test_it_makes_one_invoice_with_the_copied_lines_and_totals(self, user, client_obj):
        schedule = schedule_for(user, client_obj, net_days=14, tax_rate=Decimal('10'), notes='Thanks')

        invoice = run_schedule(schedule.pk, today=TODAY)

        assert [i.description for i in invoice.items.all()] == ['Retainer', 'Hosting']
        # 500 taxed at the invoice's 10% + 20 at its own 20%
        assert (invoice.subtotal, invoice.tax_amount, invoice.total) == (
            Decimal('520.00'),
            Decimal('54.00'),
            Decimal('574.00'),
        )
        assert invoice.status == 'draft' and invoice.notes == 'Thanks'
        assert (invoice.due_date - invoice.issue_date).days == 14
        assert invoice.recurring_source_id == schedule.pk
        assert 'Recurring' in invoice.events.get(kind='created').detail

    def test_running_it_twice_bills_once(self, user, client_obj):
        schedule = schedule_for(user, client_obj)

        first = run_schedule(schedule.pk, today=TODAY)
        second = run_schedule(schedule.pk, today=TODAY)

        assert first is not None and second is None
        assert Invoice.objects.filter(recurring_source=schedule).count() == 1

    def test_a_schedule_that_is_not_due_or_is_paused_is_left_alone(self, user, client_obj):
        future = schedule_for(user, client_obj, start_date=TODAY + timedelta(days=1))
        paused = schedule_for(user, client_obj, is_active=False)

        assert run_schedule(future.pk, today=TODAY) is None
        assert run_schedule(paused.pk, today=TODAY) is None

    def test_downtime_makes_one_invoice_and_jumps_to_the_next_future_date(self, user, client_obj):
        schedule = schedule_for(user, client_obj, start_date=date(2026, 8, 31), frequency='monthly')

        run_schedule(schedule.pk, today=TODAY)

        schedule.refresh_from_db()
        assert Invoice.objects.filter(recurring_source=schedule).count() == 1
        assert schedule.next_run == date(2026, 11, 30)  # anchored on the 31st, clamped to the month's end

    def test_the_end_date_deactivates_the_schedule(self, user, client_obj):
        schedule = schedule_for(user, client_obj, frequency='weekly', end_date=TODAY + timedelta(days=3))

        assert run_schedule(schedule.pk, today=TODAY) is not None
        schedule.refresh_from_db()
        assert schedule.is_active is False

    def test_an_archived_client_pauses_the_schedule(self, user, client_obj):
        schedule = schedule_for(user, client_obj)
        client_obj.is_archived = True
        client_obj.save()

        assert run_schedule(schedule.pk, today=TODAY) is None
        schedule.refresh_from_db()
        assert schedule.is_active is False


@pytest.mark.parametrize(
    'frequency, current, anchor, expected',
    [
        ('weekly', date(2026, 12, 28), 28, date(2027, 1, 4)),
        ('monthly', date(2026, 1, 31), 31, date(2026, 2, 28)),
        ('monthly', date(2026, 2, 28), 31, date(2026, 3, 31)),
        ('monthly', date(2026, 12, 15), 15, date(2027, 1, 15)),
        ('quarterly', date(2026, 11, 30), 30, date(2027, 2, 28)),
        ('yearly', date(2024, 2, 29), 29, date(2025, 2, 28)),
    ],
)
def test_advance(frequency, current, anchor, expected):
    assert advance(current, frequency, anchor) == expected


@pytest.mark.django_db
class TestDailyTask:
    def test_it_bills_what_is_due_and_queues_auto_send_only_when_asked(self, user, client_obj):
        auto = schedule_for(user, client_obj, start_date=timezone.localdate(), auto_send=True)
        manual = schedule_for(user, client_obj, start_date=timezone.localdate(), auto_send=False)

        with patch('apps.recurring.tasks.send_invoice.delay') as queued:
            result = generate_recurring_invoices()

        assert result == '2 recurring invoices made'
        queued.assert_called_once_with(str(Invoice.objects.get(recurring_source=auto).id))
        assert Invoice.objects.get(recurring_source=manual).status == 'draft'

    def test_an_unverified_owner_gets_a_draft_not_an_email(self, user, client_obj):
        user.email_verified = False
        user.save()
        schedule_for(user, client_obj, start_date=timezone.localdate(), auto_send=True)

        with patch('apps.recurring.tasks.send_invoice.delay') as queued:
            generate_recurring_invoices()

        queued.assert_not_called()


@pytest.mark.django_db
class TestApi:
    def payload(self, client, **extra):
        return {
            'client': str(client.id),
            'frequency': 'monthly',
            'start_date': '2026-12-01',
            'items': [{'description': 'Retainer', 'quantity': 1, 'rate': 500, 'tax_rate': 20}],
            **extra,
        }

    def test_create_read_pause_delete(self, api_client, client_obj, user):
        created = api_client.post('/api/recurring/', self.payload(client_obj), format='json')

        assert created.status_code == 201
        assert created.data['next_run'] == '2026-12-01'
        assert [(line['description'], line['rate'], line['tax_rate']) for line in created.data['lines']] == [
            ('Retainer', '500.00', '20.00')
        ]
        paused = api_client.patch(f"/api/recurring/{created.data['id']}/", {'is_active': False}, format='json')
        assert paused.data['is_active'] is False
        assert api_client.delete(f"/api/recurring/{created.data['id']}/").status_code == 204

    def test_deleting_a_schedule_keeps_its_invoices(self, user, client_obj):
        schedule = schedule_for(user, client_obj)
        invoice = run_schedule(schedule.pk, today=TODAY)
        me = APIClient()
        me.force_authenticate(user=user)

        me.delete(f'/api/recurring/{schedule.pk}/')

        invoice.refresh_from_db()
        assert invoice.recurring_source is None

    def test_another_users_client_and_schedules_are_off_limits(self, api_client):
        foreign_client = ClientFactory(user=UserFactory())
        foreign = schedule_for(foreign_client.user, foreign_client)

        refused = api_client.post('/api/recurring/', self.payload(foreign_client), format='json')

        assert refused.status_code == 400 and 'client' in refused.data
        assert api_client.get(f'/api/recurring/{foreign.pk}/').status_code == 404
        assert api_client.get('/api/recurring/').data['results'] == []

    def test_at_least_one_line_and_a_sane_date_range(self, api_client, client_obj):
        assert api_client.post('/api/recurring/', self.payload(client_obj, items=[]), format='json').status_code == 400
        backwards = self.payload(client_obj, end_date='2026-01-01')
        assert api_client.post('/api/recurring/', backwards, format='json').status_code == 400


@pytest.mark.django_db
def test_a_deactivated_account_is_never_billed_and_one_failure_does_not_stop_the_rest(user, client_obj):
    other_client = ClientFactory(user=UserFactory())
    closed = schedule_for(other_client.user, other_client, start_date=timezone.localdate())
    other_client.user.is_active = False
    other_client.user.save()
    broken = schedule_for(user, client_obj, start_date=timezone.localdate())
    fine = schedule_for(user, client_obj, start_date=timezone.localdate())

    real = run_schedule
    with patch(
        'apps.recurring.tasks.run_schedule',
        side_effect=lambda pk: (_ for _ in ()).throw(RuntimeError()) if pk == broken.pk else real(pk),
    ):
        result = generate_recurring_invoices()

    assert result == '1 recurring invoices made'
    assert Invoice.objects.filter(recurring_source=fine).count() == 1
    assert not Invoice.objects.filter(recurring_source=closed).exists()


@pytest.mark.django_db
def test_patching_only_the_end_date_cannot_put_it_before_the_start(api_client, user, client_obj):
    schedule = schedule_for(user, client_obj, start_date=TODAY)

    response = api_client.patch(f'/api/recurring/{schedule.pk}/', {'end_date': '2026-01-01'}, format='json')

    assert response.status_code == 400
