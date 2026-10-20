import copy
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from budget.conversion import convert
from budget.models import AMOUNT, RATE, Expense
from core.serializers import ModelCleanMixin


class ExpenseSerializer(ModelCleanMixin, serializers.ModelSerializer):
    """An expense in its own currency (US-11). An empty `rate` means "use the NBR rate"; the
    rate, its source and the RON amount are filled in on save (ADR 0003)."""

    amount = serializers.DecimalField(**AMOUNT)
    currency = serializers.RegexField(
        r"^[A-Z]{3}$",
        error_messages={"invalid": "Enter a three-letter currency code, for example EUR."},
    )
    rate = serializers.DecimalField(**RATE, required=False, allow_null=True)

    class Meta:
        model = Expense
        fields = [
            "id",
            "trip",
            "date",
            "description",
            "category",
            "amount",
            "currency",
            "rate",
            "rate_source",
            "amount_ron",
        ]
        read_only_fields = ["rate_source", "amount_ron"]

    def validate_amount(self, value: Decimal) -> Decimal:
        if value <= 0:
            raise serializers.ValidationError("The amount must be greater than zero.")
        return value

    def validate_rate(self, value: Decimal | None) -> Decimal | None:
        if value is not None and value <= 0:
            raise serializers.ValidationError("The rate must be greater than zero.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        rate = attrs.pop("rate", None)
        expense = copy.copy(self.instance) if self.instance else Expense()
        for field, value in attrs.items():
            setattr(expense, field, value)
        try:
            convert(expense, rate)
        except DjangoValidationError as error:
            raise serializers.ValidationError(serializers.as_serializer_error(error)) from error
        return {
            **attrs,
            "rate": expense.rate,
            "rate_source": expense.rate_source,
            "amount_ron": expense.amount_ron,
        }
