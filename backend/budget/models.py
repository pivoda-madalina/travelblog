from django.core.exceptions import ValidationError
from django.db import models

from trips.models import format_date

# Amounts are in their own currency with 2 decimal places; rates are RON per 1 unit with 6.
AMOUNT = {"max_digits": 12, "decimal_places": 2}
RATE = {"max_digits": 12, "decimal_places": 6}


class Category(models.TextChoices):
    """The fixed list of expense categories (BR-08)."""

    TRANSPORT = "transport", "Transport"
    ACCOMMODATION = "accommodation", "Accommodation"
    FOOD_AND_DRINKS = "food_and_drinks", "Food and drinks"
    ACTIVITIES = "activities", "Activities"
    SHOPPING = "shopping", "Shopping"
    OTHER = "other", "Other"


class RateSource(models.TextChoices):
    NBR = "nbr", "National Bank of Romania"
    MANUAL = "manual", "Entered by the author"


class Expense(models.Model):
    """An expense with its exchange rate frozen at the time it was saved (ADR 0003, BR-05)."""

    trip = models.ForeignKey("trips.Trip", on_delete=models.CASCADE, related_name="expenses")
    date = models.DateField()
    description = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=Category.choices)
    amount = models.DecimalField(**AMOUNT)
    currency = models.CharField(max_length=3)
    rate = models.DecimalField(**RATE)
    rate_source = models.CharField(max_length=10, choices=RateSource.choices)
    amount_ron = models.DecimalField(**AMOUNT)

    class Meta:
        ordering = ["date", "id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gt=0), name="expense_amount_greater_than_zero"
            ),
            models.CheckConstraint(
                condition=models.Q(rate__gt=0), name="expense_rate_greater_than_zero"
            ),
            models.CheckConstraint(
                condition=models.Q(category__in=Category.values),
                name="expense_category_in_fixed_list",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.description}: {self.amount} {self.currency}"

    def clean(self):
        # Expenses may be paid before the trip starts, for example flights booked in advance,
        # but not after it ends (#27).
        if self.trip_id is None or self.date is None:
            return
        if self.date > self.trip.end_date:
            end = format_date(self.trip.end_date)
            raise ValidationError({"date": f"The date cannot be after the trip ends, {end}."})


class ExchangeRate(models.Model):
    """Cache of National Bank of Romania reference rates, per unit of currency."""

    currency = models.CharField(max_length=3)
    date = models.DateField()
    rate = models.DecimalField(**RATE)

    class Meta:
        ordering = ["-date", "currency"]
        constraints = [
            models.UniqueConstraint(
                fields=["currency", "date"], name="unique_rate_per_currency_and_date"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.currency} {self.date}: {self.rate}"


class ExchangeRateFetch(models.Model):
    """A range of dates whose NBR rates are in the cache, so each date is fetched once. Days in
    the range without a rate (weekends, holidays) are known to have none (BR-03)."""

    start_date = models.DateField()
    end_date = models.DateField()
    fetched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fetched_at"]

    def __str__(self) -> str:
        return f"NBR rates {self.start_date} to {self.end_date}"
