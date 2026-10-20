"""US-13: a trip's budget summary. BR-01: totals in RON. BR-07: totals add up the rounded
amounts. BR-14: visitors cannot see budgets."""

from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from budget import conversion
from budget.models import Category
from budget.rates import RateResult
from budget.summary import budget_summary
from budget.tests.factories import ExpenseFactory
from core.tests.factories import UserFactory
from trips.models import Trip
from trips.tests.factories import TripFactory

pytestmark = pytest.mark.django_db


def summary_url(trip: Trip) -> str:
    return reverse("trip-budget", args=[trip.pk])


@pytest.fixture
def author():
    client = APIClient()
    client.force_login(UserFactory())
    return client


@pytest.fixture
def trip():
    return TripFactory(planned_budget=Decimal("5000.00"))


def spend(trip, category, amount_ron):
    return ExpenseFactory(trip=trip, category=category, amount_ron=Decimal(amount_ron))


def test_br07_totals_add_rounded_amounts(author, trip, monkeypatch):
    # 10 units at 0.333333 is 3.33333 RON, stored as 3.33: three of them total 9.99, not 10.00.
    monkeypatch.setattr(
        conversion, "nbr_rate", lambda currency, on: RateResult(Decimal("0.333333"), on)
    )
    for _ in range(3):
        response = author.post(
            reverse("expense-list"),
            {
                "trip": trip.pk,
                "date": trip.start_date.isoformat(),
                "description": "Coffee",
                "category": "food_and_drinks",
                "amount": "10.00",
                "currency": "HUF",
            },
            format="json",
        )
        assert response.json()["amount_ron"] == "3.33"

    body = author.get(summary_url(trip)).json()

    assert body["spent"] == "9.99"
    assert body["categories"][0] == {"category": "food_and_drinks", "spent": "9.99"}


def test_summary_totals_by_category_largest_first(author, trip):
    spend(trip, Category.TRANSPORT, "890.00")
    spend(trip, Category.ACCOMMODATION, "2400.00")
    spend(trip, Category.ACCOMMODATION, "0.50")
    spend(trip, Category.ACTIVITIES, "611.80")
    spend(TripFactory(), Category.SHOPPING, "999.00")  # another trip's expense

    response = author.get(summary_url(trip))

    assert response.status_code == 200
    assert response.json() == {
        "planned": "5000.00",
        "spent": "3902.30",
        "difference": "1097.70",
        "over_budget": False,
        "categories": [
            {"category": "accommodation", "spent": "2400.50"},
            {"category": "transport", "spent": "890.00"},
            {"category": "activities", "spent": "611.80"},
            # Empty categories show as zero, in the fixed order of BR-08.
            {"category": "food_and_drinks", "spent": "0.00"},
            {"category": "shopping", "spent": "0.00"},
            {"category": "other", "spent": "0.00"},
        ],
    }


def test_summary_flags_spending_over_the_planned_budget(author, trip):
    spend(trip, Category.ACCOMMODATION, "5412.30")

    body = author.get(summary_url(trip)).json()

    assert body["difference"] == "-412.30"
    assert body["over_budget"] is True


def test_spending_exactly_the_planned_budget_is_not_over():
    trip = TripFactory(planned_budget=Decimal("100.00"))
    spend(trip, Category.OTHER, "100.00")

    summary = budget_summary(trip)

    assert summary.difference == Decimal("0.00")
    assert summary.over_budget is False


def test_summary_of_a_trip_without_expenses(author, trip):
    body = author.get(summary_url(trip)).json()

    assert body["spent"] == "0.00"
    assert body["difference"] == "5000.00"
    assert body["over_budget"] is False
    assert [total["spent"] for total in body["categories"]] == ["0.00"] * 6
    assert [total["category"] for total in body["categories"]] == Category.values


def test_summary_without_a_planned_budget(author):
    trip = TripFactory(planned_budget=None)
    spend(trip, Category.FOOD_AND_DRINKS, "120.00")

    body = author.get(summary_url(trip)).json()

    assert body["planned"] is None
    assert body["difference"] is None
    assert body["over_budget"] is False
    assert body["spent"] == "120.00"


def test_summary_of_a_draft_trip_for_the_author(author):
    draft = TripFactory(status=Trip.Status.DRAFT)

    assert author.get(summary_url(draft)).status_code == 200


def test_summary_of_a_missing_trip(author, trip):
    assert author.get(reverse("trip-budget", args=[trip.pk + 1000])).status_code == 404


def test_br14_visitor_cannot_see_the_budget_summary(trip):
    spend(trip, Category.TRANSPORT, "100.00")
    visitor = APIClient()

    response = visitor.get(summary_url(trip))

    assert response.status_code == 403
    assert "spent" not in response.json()
