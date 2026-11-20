from django.urls import include, path

from rest_framework.routers import DefaultRouter

from . import api_views

router = DefaultRouter()
router.register('recurring', api_views.RecurringInvoiceViewSet, basename='recurring')

urlpatterns = [path('', include(router.urls))]
