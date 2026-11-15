from django.urls import path

from . import api_views

urlpatterns = [
    path('login/', api_views.login_view, name='api_login'),
    path('signup/', api_views.signup_view, name='api_signup'),
    path('logout/', api_views.logout_view, name='api_logout'),
    path('user/', api_views.user_view, name='api_user'),
    path('logo/', api_views.upload_logo_view, name='api_upload_logo'),
    path('password/reset/', api_views.password_reset_view, name='api_password_reset'),
]
