from django.urls import path

from . import views

app_name = 'invoices'

urlpatterns = [
    path('', views.invoice_list, name='list'),
    path('new/', views.invoice_create, name='create'),
    path('<uuid:pk>/', views.invoice_detail, name='detail'),
    path('<uuid:pk>/edit/', views.invoice_edit, name='edit'),
    path('<uuid:pk>/delete/', views.invoice_delete, name='delete'),
    path('<uuid:pk>/duplicate/', views.invoice_duplicate, name='duplicate'),
    path('<uuid:pk>/send/', views.invoice_send, name='send'),
    path('<uuid:pk>/pdf/', views.invoice_pdf, name='pdf'),
    path('<uuid:pk>/download/', views.invoice_download, name='download'),
    path('<uuid:pk>/mark-paid/', views.invoice_mark_paid, name='mark_paid'),
    path('<uuid:pk>/cancel/', views.invoice_cancel, name='cancel'),
]
