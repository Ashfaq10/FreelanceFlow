"""
URL configuration for FreelanceFlow project.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('', include('apps.dashboard.urls')),
    path('clients/', include('apps.clients.urls')),
    path('invoices/', include('apps.invoices.urls')),
    path('time/', include('apps.time_tracker.urls')),
    path('payments/', include('apps.payments.urls')),
    path('settings/', include('apps.accounts.urls')),
    
    # API endpoints
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
    
    try:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass
