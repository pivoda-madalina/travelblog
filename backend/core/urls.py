from django.urls import path

from core import auth, views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("auth/csrf/", auth.csrf, name="auth-csrf"),
    path("auth/login/", auth.sign_in, name="auth-login"),
    path("auth/logout/", auth.sign_out, name="auth-logout"),
    path("auth/me/", auth.me, name="auth-me"),
]
