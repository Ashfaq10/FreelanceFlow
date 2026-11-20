from django.db import migrations


def backfill(apps, schema_editor):
    """Give invoices that predate the timeline a starting history: created, sent, and every payment/refund."""
    Invoice = apps.get_model('invoices', 'Invoice')
    InvoiceEvent = apps.get_model('invoices', 'InvoiceEvent')
    Payment = apps.get_model('payments', 'Payment')

    events = []
    for invoice in Invoice.objects.all().iterator():
        events.append(InvoiceEvent(invoice=invoice, kind='created', created_at=invoice.created_at))
        if invoice.sent_at:
            events.append(InvoiceEvent(invoice=invoice, kind='sent', created_at=invoice.sent_at))
    for payment in Payment.objects.all().iterator():
        kind = 'refund' if payment.amount_paid < 0 else 'payment'
        events.append(
            InvoiceEvent(
                invoice_id=payment.invoice_id,
                kind=kind,
                detail=f'{abs(payment.amount_paid)} ({payment.method})',
                created_at=payment.created_at,
            )
        )
    InvoiceEvent.objects.bulk_create(events, batch_size=500)


class Migration(migrations.Migration):
    dependencies = [
        ('invoices', '0013_invoiceevent'),
        ('payments', '0002_alter_payment_invoice_alter_payment_method'),
    ]

    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
