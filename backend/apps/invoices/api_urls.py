from django.urls import path

from . import api_views, public_views

urlpatterns = [
    path('invoices/', api_views.InvoiceListCreateView.as_view(), name='api-invoice-list'),
    path('invoices/<uuid:pk>/', api_views.InvoiceDetailView.as_view(), name='api-invoice-detail'),
    path('invoices/<uuid:pk>/send/', api_views.InvoiceSendView.as_view(), name='api-invoice-send'),
    path('invoices/<uuid:pk>/mark-paid/', api_views.InvoiceMarkPaidView.as_view(), name='api-invoice-mark-paid'),
    path('invoices/<uuid:pk>/cancel/', api_views.InvoiceCancelView.as_view(), name='api-invoice-cancel'),
    path('invoices/<uuid:pk>/pdf/', api_views.InvoicePDFView.as_view(), name='api-invoice-pdf'),
    path('invoices/<uuid:pk>/duplicate/', api_views.InvoiceDuplicateView.as_view(), name='api-invoice-duplicate'),
    path('invoices/<uuid:pk>/remind/', api_views.InvoiceRemindView.as_view(), name='api-invoice-remind'),
    path('public/invoices/<str:token>/', public_views.PublicInvoiceView.as_view(), name='api-public-invoice'),
    path(
        'public/invoices/<str:token>/pdf/', public_views.PublicInvoicePDFView.as_view(), name='api-public-invoice-pdf'
    ),
    path(
        'public/invoices/<str:token>/checkout/',
        public_views.PublicInvoiceCheckoutView.as_view(),
        name='api-public-invoice-checkout',
    ),
]
