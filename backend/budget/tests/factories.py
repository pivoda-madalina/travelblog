import datetime
from decimal import Decimal

import factory

from budget.models import Category, ExchangeRate, Expense, RateSource
from trips.tests.factories import TripFactory


class ExpenseFactory(factory.django.DjangoModelFactory):
    """A 100 EUR expense at a rate of 4.9764, so 497.64 RON."""

    class Meta:
        model = Expense

    trip = factory.SubFactory(TripFactory)
    date = factory.LazyAttribute(lambda expense: expense.trip.start_date)
    description = factory.Sequence(lambda n: f"Expense {n}")
    category = Category.FOOD_AND_DRINKS
    amount = Decimal("100.00")
    currency = "EUR"
    rate = Decimal("4.976400")
    rate_source = RateSource.NBR
    amount_ron = Decimal("497.64")


class ExchangeRateFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ExchangeRate

    currency = "EUR"
    date = factory.Sequence(lambda n: datetime.date(2025, 1, 1) + datetime.timedelta(days=n))
    rate = Decimal("4.976400")
