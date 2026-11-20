"""
URL configuration for FreelanceFlow project.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from drf_spectacular.views import SpectacularAPIView

from .health import healthz

urlpatterns = [
    path('healthz/', healthz),
    path('admin/', admin.site.urls),
    # The SPA is the only UI (ADR-0001): everything below is JSON.
    path('api/payments/', include('apps.payments.urls')),  # Stripe webhook
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/auth/', include('apps.accounts.api_urls')),
    path('api/', include('apps.invoices.api_urls')),
    path('api/', include('apps.clients.api_urls')),
    path('api/', include('apps.time_tracker.api_urls')),
    path('api/', include('apps.dashboard.api_urls')),
    path('api/', include('apps.payments.api_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

    # Only when settings added it to INSTALLED_APPS (local.py); merely being importable is not enough.
    if 'debug_toolbar' in settings.INSTALLED_APPS:
        import debug_toolbar

        urlpatterns = [path('__debug__/', include(debug_toolbar.urls))] + urlpatterns
