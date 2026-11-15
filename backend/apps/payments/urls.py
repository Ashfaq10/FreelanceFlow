from django.urls import path

from . import views

app_name = 'payments'

urlpatterns = [
    path('webhook/', views.stripe_webhook, name='webhook'),
    path('success/<uuid:invoice_id>/', views.payment_success, name='success'),
    path('cancelled/<uuid:invoice_id>/', views.payment_cancelled, name='cancelled'),
]
