from django.urls import path

from . import api_views

urlpatterns = [
    path('login/', api_views.login_view, name='api_login'),
    path('signup/', api_views.signup_view, name='api_signup'),
    path('logout/', api_views.logout_view, name='api_logout'),
    path('user/', api_views.user_view, name='api_user'),
    path('verify-email/', api_views.verify_email_view, name='api_verify_email'),
    path('verify-email/resend/', api_views.resend_verification_view, name='api_resend_verification'),
    path('export/', api_views.export_view, name='api_export'),
    path('delete/', api_views.delete_account_view, name='api_delete_account'),
    path('logo/', api_views.upload_logo_view, name='api_upload_logo'),
    path('password/reset/', api_views.password_reset_view, name='api_password_reset'),
    path(
        'password/reset/confirm/',
        api_views.password_reset_confirm_view,
        name='api_password_reset_confirm',
    ),
]
