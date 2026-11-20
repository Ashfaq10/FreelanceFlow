from datetime import timedelta
from unittest.mock import patch

from django.utils import timezone

import pytest

from apps.invoices.tasks import check_overdue_invoices, send_due_soon_reminders, send_reminder

from .factories import InvoiceFactory


def sent_invoice(user, client, due_in_days):
    return InvoiceFactory(
        user=user, client=client, status='sent', due_date=timezone.now() + timedelta(days=due_in_days)
    )


@pytest.mark.django_db
class TestOverdueNotices:
    @pytest.mark.parametrize('switch', ['user', 'client'])
    def test_an_opt_out_still_marks_overdue_but_sends_nothing(self, user, client_obj, switch):
        (user if switch == 'user' else client_obj).reminders_enabled = False
        (user if switch == 'user' else client_obj).save()
        invoice = sent_invoice(user, client_obj, -1)

        with patch('apps.invoices.tasks.send_overdue_reminder.delay') as queued:
            check_overdue_invoices()

        invoice.refresh_from_db()
        assert invoice.status == 'overdue'
        queued.assert_not_called()

    def test_the_first_notice_goes_out_once_by_default(self, user, client_obj):
        invoice = sent_invoice(user, client_obj, -1)
        invoice.mark_as_overdue()
        invoice.log('reminder')
        invoice.events.update(created_at=timezone.now() - timedelta(days=30))

        with patch('apps.invoices.tasks.send_overdue_reminder.delay') as queued:
            check_overdue_invoices()

        queued.assert_not_called()  # overdue_repeat_days is 0

    def test_a_repeat_cadence_resends_only_once_the_interval_has_passed(self, client_obj):
        user = client_obj.user
        user.overdue_repeat_days = 7
        user.save()
        recent, stale = sent_invoice(user, client_obj, -20), sent_invoice(user, client_obj, -20)
        for invoice, days_ago in ((recent, 3), (stale, 8)):
            invoice.mark_as_overdue()
            invoice.log('reminder')
            invoice.events.filter(kind='reminder').update(created_at=timezone.now() - timedelta(days=days_ago))

        with patch('apps.invoices.tasks.send_overdue_reminder.delay') as queued:
            check_overdue_invoices()

        queued.assert_called_once_with(str(stale.id))


@pytest.mark.django_db
class TestDueSoon:
    def test_the_lead_time_is_the_users_choice(self, client_obj):
        user = client_obj.user
        user.remind_before_days = 5
        user.save()
        in_five, in_three = sent_invoice(user, client_obj, 5), sent_invoice(user, client_obj, 3)

        with patch('apps.invoices.tasks.send_due_soon_email') as sent:
            send_due_soon_reminders()

        assert [call.args[0].id for call in sent.call_args_list] == [in_five.id]
        assert in_three.id not in [call.args[0].id for call in sent.call_args_list]

    def test_zero_turns_it_off(self, client_obj):
        user = client_obj.user
        user.remind_before_days = 0
        user.save()
        sent_invoice(user, client_obj, 3)

        with patch('apps.invoices.tasks.send_due_soon_email') as sent:
            send_due_soon_reminders()

        sent.assert_not_called()

    def test_a_client_opt_out_is_respected(self, client_obj):
        client_obj.reminders_enabled = False
        client_obj.save()
        sent_invoice(client_obj.user, client_obj, 3)

        with patch('apps.invoices.tasks.send_due_soon_email') as sent:
            send_due_soon_reminders()

        sent.assert_not_called()

    def test_running_the_task_twice_in_a_day_mails_once(self, client_obj, mailoutbox):
        sent_invoice(client_obj.user, client_obj, 3)

        send_due_soon_reminders()
        send_due_soon_reminders()

        assert len(mailoutbox) == 1


@pytest.mark.django_db
def test_the_manual_reminder_ignores_the_opt_out(client_obj, mailoutbox):
    client_obj.reminders_enabled = False
    client_obj.save()
    invoice = sent_invoice(client_obj.user, client_obj, 3)

    send_reminder(str(invoice.id))

    assert len(mailoutbox) == 1


@pytest.mark.django_db
class TestSettingsApi:
    def test_the_owner_can_tune_reminders(self, api_client):
        response = api_client.patch(
            '/api/auth/user/',
            {'reminders_enabled': False, 'remind_before_days': 7, 'overdue_repeat_days': 14},
            format='json',
        )

        assert response.status_code == 200
        assert (response.data['remind_before_days'], response.data['overdue_repeat_days']) == (7, 14)

    @pytest.mark.parametrize('field, value', [('remind_before_days', 31), ('overdue_repeat_days', 61)])
    def test_out_of_range_values_are_refused(self, api_client, field, value):
        assert api_client.patch('/api/auth/user/', {field: value}, format='json').status_code == 400

    def test_a_client_can_be_silenced(self, api_client, client_obj):
        response = api_client.patch(f'/api/clients/{client_obj.id}/', {'reminders_enabled': False}, format='json')

        assert response.status_code == 200 and response.data['reminders_enabled'] is False
