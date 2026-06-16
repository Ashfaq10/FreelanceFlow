from django.urls import path

from . import views

app_name = 'time_tracker'

urlpatterns = [
    path('', views.time_log_list, name='list'),
    path('new/', views.time_log_create, name='create'),
    path('<uuid:pk>/edit/', views.time_log_edit, name='edit'),
    path('<uuid:pk>/delete/', views.time_log_delete, name='delete'),
    path('unbilled/', views.unbilled_time_logs, name='unbilled'),
    path('unbilled/<uuid:client_id>/', views.unbilled_time_logs, name='unbilled_by_client'),
]
