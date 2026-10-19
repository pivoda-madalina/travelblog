from django.urls import path

from budget.views import exchange_rate

urlpatterns = [
    path("rates/", exchange_rate, name="exchange-rate"),
]
