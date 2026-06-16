from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

router = DefaultRouter()
router.register('time-logs', api_views.TimeLogViewSet, basename='time-log')

urlpatterns = [
    path('', include(router.urls)),
]
