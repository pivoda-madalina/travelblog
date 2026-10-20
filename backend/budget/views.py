from django.shortcuts import get_object_or_404
from rest_framework import serializers, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from budget.models import Expense
from budget.rates import nbr_rate
from budget.serializers import ExpenseSerializer
from budget.summary import budget_summary
from core.permissions import IsAuthor
from trips.models import Trip


class ExpenseViewSet(viewsets.ModelViewSet):
    """A trip's expenses by date: `/api/expenses/?trip=12`. For the author only, reads
    included (BR-14)."""

    queryset = Expense.objects.order_by("date", "id")
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthor]

    def get_queryset(self):
        queryset = super().get_queryset()
        trip = self.request.query_params.get("trip")
        if trip is not None:
            queryset = queryset.filter(trip=trip) if trip.isdigit() else queryset.none()
        return queryset


class RateQuerySerializer(serializers.Serializer):
    currency = serializers.RegexField(r"^[A-Z]{3}$")
    date = serializers.DateField()


@api_view(["GET"])
@permission_classes([IsAuthor])
def exchange_rate(request):
    """`GET /api/rates/?currency=EUR&date=2026-05-12`, for the expense form (BR-02, BR-03).
    Without a rate, `rate` is null and `detail` asks the author to enter one (BR-04)."""
    query = RateQuerySerializer(data=request.query_params)
    query.is_valid(raise_exception=True)
    currency, date = query.validated_data["currency"], query.validated_data["date"]
    result = nbr_rate(currency, date)
    return Response(
        {
            "currency": currency,
            "date": date,
            "rate": None if result.rate is None else f"{result.rate:.6f}",
            "rate_date": result.rate_date,
            "detail": result.message,
        }
    )


def money(amount):
    return None if amount is None else f"{amount:.2f}"


@api_view(["GET"])
@permission_classes([IsAuthor])
def trip_budget(request, pk):
    """`GET /api/trips/{id}/budget/`: total spent, spending by category and planned versus spent,
    all in RON (US-13, BR-01). For the author only (BR-14). `difference` is planned minus spent,
    null without a planned budget."""
    trip = get_object_or_404(Trip.objects.visible_to(request.user), pk=pk)
    summary = budget_summary(trip)
    return Response(
        {
            "planned": money(summary.planned),
            "spent": money(summary.spent),
            "difference": money(summary.difference),
            "over_budget": summary.over_budget,
            "categories": [
                {"category": total.category.value, "spent": money(total.spent)}
                for total in summary.categories
            ],
        }
    )
