from django.db import transaction


@transaction.atomic
def erase_account(user):
    """Erase the person, keep the books (FEAT-4).

    Issued invoices, payments, credit notes and the clients they name are accounting records that must be
    kept (AGENTS.md, DATA-1), so they stay, owned by an inert account. Everything else personal goes.
    """
    from apps.clients.models import Client
    from apps.invoices.models import Invoice
    from apps.quotes.models import Quote
    from apps.recurring.models import RecurringInvoice
    from apps.time_tracker.models import TimeLog

    Invoice.objects.filter(user=user, status='draft').delete()  # drafts never carry payments
    TimeLog.objects.filter(user=user).delete()
    RecurringInvoice.objects.filter(user=user).delete()  # would otherwise keep billing a closed account
    Quote.objects.filter(user=user).exclude(status='converted').delete()  # open proposals must stop being public
    Client.objects.filter(user=user, invoices__isnull=True, quotes__isnull=True).delete()

    for invoice in Invoice.objects.filter(user=user).exclude(pdf_file='').exclude(pdf_file__isnull=True):
        invoice.pdf_file.delete(save=True)  # stored PDFs carry the business details being erased

    if user.logo:
        user.logo.delete(save=False)
    for field in (
        'full_name', 'business_tagline', 'business_email', 'business_phone', 'phone', 'address',
        'tax_number', 'bank_details', 'invoice_terms', 'website',
    ):  # fmt: skip
        setattr(user, field, '')
    user.business_name = 'Deleted account'  # shown on the pay link of a retained invoice
    user.email = f'deleted-{user.pk}@deleted.invalid'
    user.email_verified = False
    user.reminders_enabled = False
    user.is_active = False
    user.set_unusable_password()  # also ends every session: Django ties them to the password hash
    user.save()
