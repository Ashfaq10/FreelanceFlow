"""Refunds and expired checkout sessions (PAY-4)."""

from decimal import Decimal

import pytest

from apps.invoices.models import InvoiceItem
from apps.payments.models import Payment
from apps.payments.views import handle_expired_session, handle_refund, handle_successful_payment

from .factories import InvoiceFactory


@pytest.fixture
def paid_invoice(db, user, client_obj):
    invoice = InvoiceFactory(user=user, client=client_obj, status='sent')
    InvoiceItem.objects.create(invoice=invoice, description='Work', quantity=1, unit_price=Decimal('500.00'))
    invoice.save()
    handle_successful_payment(
        {
            'id': 'cs_1',
            'payment_intent': 'pi_1',
            'amount_total': 50000,
            'payment_status': 'paid',
            'metadata': {'invoice_id': str(invoice.id)},
        }
    )
    invoice.refresh_from_db()
    assert invoice.status == 'paid'
    return invoice


def refund_event(amount_cents, payment_intent='pi_1'):
    return {'payment_intent': payment_intent, 'amount_refunded': amount_cents}


@pytest.mark.django_db
class TestRefunds:
    def test_a_full_refund_reopens_the_invoice(self, paid_invoice):
        handle_refund(refund_event(50000))

        paid_invoice.refresh_from_db()
        assert paid_invoice.status == 'sent'
        assert paid_invoice.amount_paid == Decimal('0.00')
        assert paid_invoice.amount_due == Decimal('500.00')

    def test_a_partial_refund_leaves_the_rest_paid(self, paid_invoice):
        handle_refund(refund_event(20000))

        paid_invoice.refresh_from_db()
        assert paid_invoice.amount_paid == Decimal('300.00')
        assert paid_invoice.amount_due == Decimal('200.00')
        assert paid_invoice.status == 'sent'

    def test_a_redelivered_refund_is_recorded_once(self, paid_invoice):
        handle_refund(refund_event(20000))
        handle_refund(refund_event(20000))

        assert paid_invoice.payments.filter(amount_paid__lt=0).count() == 1

    def test_a_second_refund_records_only_the_difference(self, paid_invoice):
        handle_refund(refund_event(20000))
        handle_refund(refund_event(50000))  # Stripe reports the cumulative amount

        refunds = sorted(p.amount_paid for p in paid_invoice.payments.filter(amount_paid__lt=0))
        assert refunds == [Decimal('-300.00'), Decimal('-200.00')]
        paid_invoice.refresh_from_db()
        assert paid_invoice.amount_paid == Decimal('0.00')

    def test_an_overdue_invoice_comes_back_overdue(self, paid_invoice):
        from datetime import timedelta

        from django.utils import timezone

        paid_invoice.due_date = timezone.now() - timedelta(days=5)
        paid_invoice.save(update_fields=['due_date'])

        handle_refund(refund_event(50000))

        paid_invoice.refresh_from_db()
        assert paid_invoice.status == 'overdue'

    def test_an_unknown_payment_intent_is_ignored(self, paid_invoice):
        handle_refund(refund_event(50000, payment_intent='pi_unknown'))

        paid_invoice.refresh_from_db()
        assert paid_invoice.status == 'paid'
        assert Payment.objects.filter(amount_paid__lt=0).count() == 0


@pytest.mark.django_db
def test_an_expired_session_clears_the_dead_pay_link(user, client_obj):
    invoice = InvoiceFactory(
        user=user,
        client=client_obj,
        status='sent',
        stripe_session_id='cs_old',
        stripe_payment_url='https://checkout.stripe.test/cs_old',
    )

    handle_expired_session({'id': 'cs_old'})

    invoice.refresh_from_db()
    assert invoice.stripe_session_id == ''
    assert invoice.stripe_payment_url == ''
