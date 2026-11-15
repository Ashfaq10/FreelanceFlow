from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import InvoiceForm, InvoiceItemFormSet, InvoiceSendForm
from .models import Invoice
from .tasks import generate_and_store_pdf, send_invoice_email
from .utils import generate_pdf


@login_required
def invoice_list(request):
    invoices = Invoice.objects.filter(user=request.user)

    status_filter = request.GET.get('status')
    if status_filter:
        invoices = invoices.filter(status=status_filter)

    client_filter = request.GET.get('client')
    if client_filter:
        invoices = invoices.filter(client_id=client_filter)

    search = request.GET.get('q')
    if search:
        invoices = invoices.filter(
            Q(invoice_number__icontains=search)
            | Q(client__name__icontains=search)
            | Q(client__company__icontains=search)
        )

    invoices = invoices.select_related('client').order_by('-issue_date')

    status_counts = {
        'all': Invoice.objects.filter(user=request.user).count(),
        'draft': Invoice.objects.filter(user=request.user, status='draft').count(),
        'sent': Invoice.objects.filter(user=request.user, status='sent').count(),
        'overdue': Invoice.objects.filter(user=request.user, status='overdue').count(),
        'paid': Invoice.objects.filter(user=request.user, status='paid').count(),
    }

    return render(
        request,
        'invoices/list.html',
        {
            'invoices': invoices,
            'status_counts': status_counts,
            'current_status': status_filter,
            'clients': request.user.clients.filter(is_archived=False),
        },
    )


@login_required
def invoice_detail(request, pk):
    invoice = get_object_or_404(
        Invoice.objects.select_related('client', 'user').prefetch_related('items'), pk=pk, user=request.user
    )

    return render(request, 'invoices/detail.html', {'invoice': invoice})


@login_required
def invoice_create(request):
    if request.method == 'POST':
        form = InvoiceForm(request.user, request.POST)
        formset = InvoiceItemFormSet(request.POST)

        if form.is_valid() and formset.is_valid():
            invoice = form.save(commit=False)
            invoice.user = request.user
            invoice.save()

            formset.instance = invoice
            formset.save()

            invoice.calculate_totals()
            invoice.save()

            messages.success(request, f'Invoice {invoice.invoice_number} created.')
            return redirect('invoices:detail', pk=invoice.pk)
    else:
        form = InvoiceForm(request.user)
        formset = InvoiceItemFormSet()

    return render(
        request,
        'invoices/form.html',
        {
            'form': form,
            'formset': formset,
            'title': 'Create Invoice',
        },
    )


@login_required
def invoice_edit(request, pk):
    invoice = get_object_or_404(Invoice, pk=pk, user=request.user)

    if not invoice.is_editable:
        messages.error(request, 'This invoice cannot be edited.')
        return redirect('invoices:detail', pk=invoice.pk)

    if request.method == 'POST':
        form = InvoiceForm(request.user, request.POST, instance=invoice)
        formset = InvoiceItemFormSet(request.POST, instance=invoice)

        if form.is_valid() and formset.is_valid():
            invoice = form.save()
            formset.save()

            invoice.calculate_totals()
            invoice.save()

            messages.success(request, 'Invoice updated.')
            return redirect('invoices:detail', pk=invoice.pk)
    else:
        form = InvoiceForm(request.user, instance=invoice)
        formset = InvoiceItemFormSet(instance=invoice)

    return render(
        request,
        'invoices/form.html',
        {
            'form': form,
            'formset': formset,
            'invoice': invoice,
            'title': f'Edit {invoice.invoice_number}',
        },
    )


@login_required
def invoice_delete(request, pk):
    invoice = get_object_or_404(Invoice, pk=pk, user=request.user)

    if not invoice.is_editable:
        messages.error(request, 'Only draft invoices can be deleted.')
        return redirect('invoices:detail', pk=invoice.pk)

    if request.method == 'POST':
        invoice_number = invoice.invoice_number
        invoice.delete()
        messages.success(request, f'Invoice {invoice_number} deleted.')
        return redirect('invoices:list')

    return render(request, 'invoices/confirm_delete.html', {'invoice': invoice})


@login_required
def invoice_duplicate(request, pk):
    original = get_object_or_404(Invoice, pk=pk, user=request.user)

    new_invoice = Invoice.objects.create(
        user=original.user,
        client=original.client,
        due_date=original.due_date,
        tax_rate=original.tax_rate,
        notes=original.notes,
        status='draft',
    )

    for item in original.items.all():
        new_invoice.items.create(
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
        )

    new_invoice.calculate_totals()
    new_invoice.save()

    messages.success(request, f'Invoice duplicated as {new_invoice.invoice_number}.')
    return redirect('invoices:edit', pk=new_invoice.pk)


@login_required
def invoice_send(request, pk):
    invoice = get_object_or_404(Invoice, pk=pk, user=request.user)

    if invoice.status not in ['draft', 'sent']:
        messages.error(request, 'This invoice cannot be sent.')
        return redirect('invoices:detail', pk=invoice.pk)

    if request.method == 'POST':
        form = InvoiceSendForm(request.POST)
        if form.is_valid():
            generate_and_store_pdf.delay(str(invoice.id))

            if form.cleaned_data.get('send_email'):
                send_invoice_email.delay(str(invoice.id), form.cleaned_data.get('message', ''))
                messages.success(request, f'Invoice {invoice.invoice_number} is being sent to {invoice.client.email}.')
            else:
                invoice.mark_as_sent()
                messages.success(request, f'Invoice {invoice.invoice_number} marked as sent.')

            return redirect('invoices:detail', pk=invoice.pk)
    else:
        form = InvoiceSendForm()

    return render(
        request,
        'invoices/send.html',
        {
            'invoice': invoice,
            'form': form,
        },
    )


@login_required
def invoice_pdf(request, pk):
    invoice = get_object_or_404(
        Invoice.objects.select_related('client', 'user').prefetch_related('items'), pk=pk, user=request.user
    )

    template = request.GET.get('template', 'classic')
    color = request.GET.get('color', 'indigo')
    timezone_str = request.GET.get('timezone')

    pdf_bytes = generate_pdf(invoice, template=template, color=color, timezone_str=timezone_str)
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="{invoice.invoice_number}.pdf"'
    return response


@login_required
def invoice_download(request, pk):
    invoice = get_object_or_404(Invoice, pk=pk, user=request.user)

    template = request.GET.get('template', 'classic')
    color = request.GET.get('color', 'indigo')
    timezone_str = request.GET.get('timezone')

    pdf_bytes = generate_pdf(invoice, template=template, color=color, timezone_str=timezone_str)
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
    return response


@login_required
@require_POST
def invoice_mark_paid(request, pk):
    invoice = get_object_or_404(Invoice, pk=pk, user=request.user)
    invoice.mark_as_paid()
    messages.success(request, f'Invoice {invoice.invoice_number} marked as paid.')
    return redirect('invoices:detail', pk=invoice.pk)


@login_required
@require_POST
def invoice_cancel(request, pk):
    invoice = get_object_or_404(Invoice, pk=pk, user=request.user)
    invoice.cancel()
    messages.success(request, f'Invoice {invoice.invoice_number} cancelled.')
    return redirect('invoices:detail', pk=invoice.pk)
