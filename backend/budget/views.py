from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from budget.rates import nbr_rate
from core.permissions import IsAuthor


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
