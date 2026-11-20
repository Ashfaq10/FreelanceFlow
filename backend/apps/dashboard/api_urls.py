from django.urls import path

from . import api_views, exports

urlpatterns = [
    path('dashboard/summary/', api_views.DashboardSummaryView.as_view(), name='api-dashboard-summary'),
    path('dashboard/monthly-revenue/', api_views.MonthlyRevenueView.as_view(), name='api-monthly-revenue'),
    path('exports/invoices/', exports.InvoicesExportView.as_view(), name='api-export-invoices'),
    path('exports/payments/', exports.PaymentsExportView.as_view(), name='api-export-payments'),
    path('exports/time-logs/', exports.TimeLogsExportView.as_view(), name='api-export-time-logs'),
]
