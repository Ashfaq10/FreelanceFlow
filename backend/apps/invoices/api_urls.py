from django.urls import path

from . import api_views

urlpatterns = [
    path('invoices/', api_views.InvoiceListCreateView.as_view(), name='api-invoice-list'),
    path('invoices/<uuid:pk>/', api_views.InvoiceDetailView.as_view(), name='api-invoice-detail'),
    path('invoices/<uuid:pk>/send/', api_views.InvoiceSendView.as_view(), name='api-invoice-send'),
    path('invoices/<uuid:pk>/mark-paid/', api_views.InvoiceMarkPaidView.as_view(), name='api-invoice-mark-paid'),
    path('invoices/<uuid:pk>/cancel/', api_views.InvoiceCancelView.as_view(), name='api-invoice-cancel'),
    path('invoices/<uuid:pk>/pdf/', api_views.InvoicePDFView.as_view(), name='api-invoice-pdf'),
]
