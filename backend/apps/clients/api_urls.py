from django.urls import path

from . import api_views

urlpatterns = [
    path('clients/', api_views.ClientListCreateView.as_view(), name='api-client-list'),
    path('clients/<uuid:pk>/', api_views.ClientDetailView.as_view(), name='api-client-detail'),
]
