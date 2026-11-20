from django.urls import include, path

from rest_framework.routers import DefaultRouter

from . import api_views, public_views

router = DefaultRouter()
router.register('quotes', api_views.QuoteViewSet, basename='quote')

urlpatterns = [
    path('quotes/<uuid:pk>/send/', api_views.QuoteSendView.as_view(), name='api-quote-send'),
    path('quotes/<uuid:pk>/convert/', api_views.QuoteConvertView.as_view(), name='api-quote-convert'),
    path('quotes/<uuid:pk>/pdf/', api_views.QuotePDFView.as_view(), name='api-quote-pdf'),
    path('public/quotes/<str:token>/', public_views.PublicQuoteView.as_view(), name='api-public-quote'),
    path('public/quotes/<str:token>/pdf/', public_views.PublicQuotePDFView.as_view(), name='api-public-quote-pdf'),
    path('public/quotes/<str:token>/accept/', public_views.PublicQuoteRespondView.as_view(), name='api-quote-accept'),
    path('public/quotes/<str:token>/decline/', public_views.PublicQuoteDeclineView.as_view(), name='api-quote-decline'),
    path('', include(router.urls)),
]
