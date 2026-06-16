from django.urls import path

from . import api_views

urlpatterns = [
    path('dashboard/summary/', api_views.DashboardSummaryView.as_view(), name='api-dashboard-summary'),
    path('dashboard/monthly-revenue/', api_views.MonthlyRevenueView.as_view(), name='api-monthly-revenue'),
]
