from django.urls import path
from rest_framework.routers import SimpleRouter

from budget.views import ExpenseViewSet, exchange_rate, trip_budget

router = SimpleRouter()
router.register("expenses", ExpenseViewSet, basename="expense")

urlpatterns = [
    path("rates/", exchange_rate, name="exchange-rate"),
    path("trips/<int:pk>/budget/", trip_budget, name="trip-budget"),
    *router.urls,
]
