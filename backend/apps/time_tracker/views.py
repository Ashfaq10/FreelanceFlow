from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import F, Sum
from django.shortcuts import get_object_or_404, redirect, render

from .forms import TimeLogForm
from .models import TimeLog


@login_required
def time_log_list(request):
    time_logs = TimeLog.objects.filter(user=request.user).select_related('client', 'invoice')

    client_filter = request.GET.get('client')
    if client_filter:
        time_logs = time_logs.filter(client_id=client_filter)

    billed_filter = request.GET.get('billed')
    if billed_filter == 'yes':
        time_logs = time_logs.filter(is_billed=True)
    elif billed_filter == 'no':
        time_logs = time_logs.filter(is_billed=False)

    month = request.GET.get('month')
    if month:
        year, month_num = month.split('-')
        time_logs = time_logs.filter(work_date__year=year, work_date__month=month_num)

    unbilled_total = TimeLog.objects.filter(user=request.user, is_billed=False).aggregate(
        total_hours=Sum('hours'), total_amount=Sum('hours') * Sum('hourly_rate') / Sum('hours') if Sum('hours') else 0
    )

    unbilled_amount = (
        TimeLog.objects.filter(user=request.user, is_billed=False)
        .annotate(amount=F('hours') * F('hourly_rate'))
        .aggregate(total=Sum('amount'))['total']
        or 0
    )

    return render(
        request,
        'time_tracker/list.html',
        {
            'time_logs': time_logs,
            'clients': request.user.clients.filter(is_archived=False),
            'unbilled_hours': unbilled_total.get('total_hours') or 0,
            'unbilled_amount': unbilled_amount,
        },
    )


@login_required
def time_log_create(request):
    if request.method == 'POST':
        form = TimeLogForm(request.user, request.POST)
        if form.is_valid():
            time_log = form.save(commit=False)
            time_log.user = request.user
            time_log.save()
            messages.success(request, 'Time entry added.')

            if request.headers.get('HX-Request'):
                return render(request, 'time_tracker/partials/time_log_row.html', {'time_log': time_log})

            return redirect('time_tracker:list')
    else:
        form = TimeLogForm(request.user)

    if request.headers.get('HX-Request'):
        return render(request, 'time_tracker/partials/time_log_form.html', {'form': form})

    return render(
        request,
        'time_tracker/form.html',
        {
            'form': form,
            'title': 'Log Time',
        },
    )


@login_required
def time_log_edit(request, pk):
    time_log = get_object_or_404(TimeLog, pk=pk, user=request.user)

    if time_log.is_billed:
        messages.error(request, 'Cannot edit a billed time entry.')
        return redirect('time_tracker:list')

    if request.method == 'POST':
        form = TimeLogForm(request.user, request.POST, instance=time_log)
        if form.is_valid():
            form.save()
            messages.success(request, 'Time entry updated.')
            return redirect('time_tracker:list')
    else:
        form = TimeLogForm(request.user, instance=time_log)

    return render(
        request,
        'time_tracker/form.html',
        {
            'form': form,
            'time_log': time_log,
            'title': 'Edit Time Entry',
        },
    )


@login_required
def time_log_delete(request, pk):
    time_log = get_object_or_404(TimeLog, pk=pk, user=request.user)

    if time_log.is_billed:
        messages.error(request, 'Cannot delete a billed time entry.')
        return redirect('time_tracker:list')

    if request.method == 'POST':
        time_log.delete()
        messages.success(request, 'Time entry deleted.')

        if request.headers.get('HX-Request'):
            return render(request, 'time_tracker/partials/empty.html')

        return redirect('time_tracker:list')

    return render(request, 'time_tracker/confirm_delete.html', {'time_log': time_log})


@login_required
def unbilled_time_logs(request, client_id=None):
    """Get unbilled time logs, optionally filtered by client."""
    time_logs = TimeLog.objects.filter(user=request.user, is_billed=False).select_related('client')

    if client_id:
        time_logs = time_logs.filter(client_id=client_id)

    return render(
        request,
        'time_tracker/partials/unbilled_list.html',
        {
            'time_logs': time_logs,
        },
    )
