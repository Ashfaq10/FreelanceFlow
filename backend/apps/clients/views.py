from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404, redirect, render

from .forms import ClientForm
from .models import Client


@login_required
def client_list(request):
    clients = (
        Client.objects.filter(user=request.user, is_archived=False)
        .annotate(
            invoice_count=Count('invoices'),
            total_revenue=Sum('invoices__total', filter=models.Q(invoices__status='paid')),
        )
        .order_by('name')
    )

    archived_count = Client.objects.filter(user=request.user, is_archived=True).count()

    return render(
        request,
        'clients/list.html',
        {
            'clients': clients,
            'archived_count': archived_count,
        },
    )


@login_required
def client_detail(request, pk):
    client = get_object_or_404(Client, pk=pk, user=request.user)
    invoices = client.invoices.all().order_by('-issue_date')

    return render(
        request,
        'clients/detail.html',
        {
            'client': client,
            'invoices': invoices,
        },
    )


@login_required
def client_create(request):
    if request.method == 'POST':
        form = ClientForm(request.POST)
        if form.is_valid():
            client = form.save(commit=False)
            client.user = request.user
            client.save()
            messages.success(request, f'Client "{client.name}" created successfully.')
            return redirect('clients:detail', pk=client.pk)
    else:
        form = ClientForm()

    return render(
        request,
        'clients/form.html',
        {
            'form': form,
            'title': 'Add New Client',
        },
    )


@login_required
def client_edit(request, pk):
    client = get_object_or_404(Client, pk=pk, user=request.user)

    if request.method == 'POST':
        form = ClientForm(request.POST, instance=client)
        if form.is_valid():
            form.save()
            messages.success(request, 'Client updated successfully.')
            return redirect('clients:detail', pk=client.pk)
    else:
        form = ClientForm(instance=client)

    return render(
        request,
        'clients/form.html',
        {
            'form': form,
            'client': client,
            'title': f'Edit {client.name}',
        },
    )


@login_required
def client_archive(request, pk):
    client = get_object_or_404(Client, pk=pk, user=request.user)

    if request.method == 'POST':
        client.is_archived = True
        client.save()
        messages.success(request, f'Client "{client.name}" archived.')
        return redirect('clients:list')

    return render(request, 'clients/confirm_archive.html', {'client': client})


@login_required
def client_restore(request, pk):
    client = get_object_or_404(Client, pk=pk, user=request.user)

    if request.method == 'POST':
        client.is_archived = False
        client.save()
        messages.success(request, f'Client "{client.name}" restored.')
        return redirect('clients:detail', pk=client.pk)

    return redirect('clients:list')


@login_required
def archived_clients(request):
    clients = Client.objects.filter(user=request.user, is_archived=True).order_by('name')

    return render(request, 'clients/archived.html', {'clients': clients})


from django.db import models
