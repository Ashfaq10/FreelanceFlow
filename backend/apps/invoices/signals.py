from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Invoice, InvoiceItem


@receiver(post_save, sender=InvoiceItem)
def update_invoice_totals_on_item_save(sender, instance, **kwargs):
    """Recalculate invoice totals when an item is saved."""
    invoice = instance.invoice
    invoice.calculate_totals()
    Invoice.objects.filter(pk=invoice.pk).update(
        subtotal=invoice.subtotal, tax_amount=invoice.tax_amount, total=invoice.total
    )


@receiver(post_delete, sender=InvoiceItem)
def update_invoice_totals_on_item_delete(sender, instance, **kwargs):
    """Recalculate invoice totals when an item is deleted."""
    try:
        invoice = instance.invoice
        invoice.calculate_totals()
        Invoice.objects.filter(pk=invoice.pk).update(
            subtotal=invoice.subtotal, tax_amount=invoice.tax_amount, total=invoice.total
        )
    except Invoice.DoesNotExist:
        pass
