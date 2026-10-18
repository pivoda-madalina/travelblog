from django.db import models

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
