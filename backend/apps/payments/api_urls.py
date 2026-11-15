from django.urls import path

from . import api_views

urlpatterns = [
    path('invoices/<uuid:pk>/checkout/', api_views.InvoiceCheckoutView.as_view(), name='api-invoice-checkout'),
    path('invoices/<uuid:pk>/payments/', api_views.InvoicePaymentCreateView.as_view(), name='api-invoice-payments'),
]
