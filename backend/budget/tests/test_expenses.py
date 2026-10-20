"""US-11: the author records, edits and deletes a trip's expenses. BR-08: the fixed categories.
BR-14: visitors cannot see or change expenses. Expenses may predate the trip but not follow it
(#27)."""

import datetime
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework.test import APIClient

from budget import conversion
from budget.models import Expense, RateSource
from budget.rates import RateResult
from budget.tests.factories import ExpenseFactory
from core.tests.factories import UserFactory
from trips.tests.factories import TripFactory

pytestmark = pytest.mark.django_db

LIST = reverse("expense-list")


def day(n: int) -> datetime.date:
    return datetime.date(2026, 5, n)


def detail(expense: Expense) -> str:
    return reverse("expense-detail", args=[expense.pk])


@pytest.fixture
def visitor():
    return APIClient()


@pytest.fixture
def author():
    client = APIClient()
    client.force_login(UserFactory())
    return client


@pytest.fixture
def trip():
    return TripFactory(start_date=day(12), end_date=day(20))


@pytest.fixture(autouse=True)
def nbr(monkeypatch):
    """The NBR rate is 4.9764 for any currency and date; tests never call the network."""
    asked = []

    def fake_rate(currency, on):
        asked.append((currency, on))
        return RateResult(Decimal("4.976400"), on)

    monkeypatch.setattr(conversion, "nbr_rate", fake_rate)
    return asked


def expense_data(trip, **overrides):
    return {
        "trip": trip.pk,
        "date": "2026-05-13",
        "description": "Vatican tickets",
        "category": "activities",
        "amount": "60.00",
        "currency": "EUR",
        **overrides,
    }


def test_author_records_an_expense(author, trip, nbr):
    response = author.post(LIST, expense_data(trip), format="json")

    assert response.status_code == 201
    expense = Expense.objects.get()
    assert response.json() == {
        "id": expense.pk,
        "trip": trip.pk,
        "date": "2026-05-13",
        "description": "Vatican tickets",
        "category": "activities",
        "amount": "60.00",
        "currency": "EUR",
        "rate": "4.976400",
        "rate_source": "nbr",
        "amount_ron": "298.58",
    }
    assert nbr == [("EUR", day(13))]


def test_a_typed_rate_is_used_instead_of_the_nbr_rate(author, trip, nbr):
    response = author.post(LIST, expense_data(trip, rate="4.98"), format="json")

    assert response.status_code == 201
    assert response.json()["rate"] == "4.980000"
    assert response.json()["rate_source"] == "manual"
    assert response.json()["amount_ron"] == "298.80"
    assert nbr == []


def test_ron_expense_needs_no_rate(author, trip, nbr):
    response = author.post(LIST, expense_data(trip, currency="RON", amount="120.00"), format="json")

    assert response.json()["rate"] == "1.000000"
    assert response.json()["amount_ron"] == "120.00"
    assert nbr == []


def test_another_currency_code_can_be_typed_with_its_rate(author, trip, monkeypatch):
    monkeypatch.setattr(
        conversion, "nbr_rate", lambda currency, on: RateResult(None, message="Enter the rate.")
    )

    without_rate = author.post(LIST, expense_data(trip, currency="VND"), format="json")
    with_rate = author.post(
        LIST, expense_data(trip, currency="VND", rate="0.000175"), format="json"
    )

    assert without_rate.status_code == 400
    assert without_rate.json() == {"rate": ["Enter the rate."]}
    assert with_rate.status_code == 201
    assert with_rate.json()["amount_ron"] == "0.01"


@pytest.mark.parametrize("amount", ["0", "0.00", "-5.00"])
def test_amount_zero_or_negative_is_refused(author, trip, amount):
    response = author.post(LIST, expense_data(trip, amount=amount), format="json")

    assert response.status_code == 400
    assert response.json() == {"amount": ["The amount must be greater than zero."]}
    assert not Expense.objects.exists()


def test_br08_invalid_category_is_refused(author, trip):
    response = author.post(LIST, expense_data(trip, category="souvenirs"), format="json")

    assert response.status_code == 400
    assert response.json() == {"category": ['"souvenirs" is not a valid choice.']}


@pytest.mark.parametrize("currency", ["eur", "EURO", "E1"])
def test_currency_must_be_a_three_letter_code(author, trip, currency):
    response = author.post(LIST, expense_data(trip, currency=currency), format="json")

    assert response.status_code == 400
    assert response.json() == {"currency": ["Enter a three-letter currency code, for example EUR."]}


def test_rate_must_be_greater_than_zero(author, trip):
    response = author.post(LIST, expense_data(trip, rate="0"), format="json")

    assert response.status_code == 400
    assert response.json() == {"rate": ["The rate must be greater than zero."]}


def test_required_fields(author):
    response = author.post(LIST, {}, format="json")

    assert response.status_code == 400
    assert set(response.json()) == {"trip", "date", "description", "category", "amount", "currency"}


def test_expense_dated_after_the_trip_is_refused(author, trip):
    response = author.post(LIST, expense_data(trip, date="2026-05-21"), format="json")

    assert response.status_code == 400
    assert response.json() == {"date": ["The date cannot be after the trip ends, 20 May 2026."]}


@pytest.mark.parametrize("date", [day(1), day(12), day(20)])
def test_expense_may_be_dated_before_or_during_the_trip(trip, date):
    ExpenseFactory.build(trip=trip, date=date).clean()


def test_expense_without_trip_or_date_is_left_to_the_required_field_errors():
    Expense().clean()


def test_trip_end_cannot_move_before_an_expense(trip):
    ExpenseFactory(trip=trip, date=day(19))
    trip.end_date = day(18)

    with pytest.raises(ValidationError) as error:
        trip.clean()

    assert error.value.message_dict == {
        "end_date": ["An expense is dated 19 May 2026, after this end date. Change its date first."]
    }


def test_trip_start_can_move_after_an_expense(trip):
    ExpenseFactory(trip=trip, date=day(10))
    trip.start_date = day(14)

    trip.clean()


def test_author_lists_a_trips_expenses_by_date(author, trip):
    later = ExpenseFactory(trip=trip, date=day(15))
    earlier = ExpenseFactory(trip=trip, date=day(13))
    ExpenseFactory(trip=TripFactory(start_date=day(25), end_date=day(28)))

    response = author.get(LIST, {"trip": trip.pk})

    assert [item["id"] for item in response.json()] == [earlier.pk, later.pk]


def test_an_invalid_trip_filter_finds_nothing(author, trip):
    ExpenseFactory(trip=trip)

    assert author.get(LIST, {"trip": "rome"}).json() == []


def test_author_edits_an_expense(author, trip, nbr):
    expense = ExpenseFactory(trip=trip, date=day(13))

    response = author.patch(
        detail(expense), {"description": "Taxi", "category": "transport"}, format="json"
    )

    assert response.status_code == 200
    expense.refresh_from_db()
    assert (expense.description, expense.category) == ("Taxi", "transport")


def test_editing_the_amount_converts_it_again(author, trip):
    expense = ExpenseFactory(trip=trip, date=day(13))

    response = author.patch(detail(expense), {"amount": "50.00"}, format="json")

    assert response.json()["amount_ron"] == "248.82"


def test_edit_is_validated_too(author, trip):
    expense = ExpenseFactory(trip=trip)

    response = author.patch(detail(expense), {"amount": "-1"}, format="json")

    assert response.status_code == 400
    expense.refresh_from_db()
    assert expense.amount == Decimal("100.00")


def test_author_deletes_an_expense(author, trip):
    expense = ExpenseFactory(trip=trip)

    response = author.delete(detail(expense))

    assert response.status_code == 204
    assert not Expense.objects.exists()


def test_br14_visitor_cannot_see_expenses(visitor, trip):
    expense = ExpenseFactory(trip=trip)

    assert visitor.get(LIST, {"trip": trip.pk}).status_code == 403
    assert visitor.get(detail(expense)).status_code == 403


def test_br14_visitor_cannot_record_change_or_delete_expenses(visitor, trip):
    expense = ExpenseFactory(trip=trip)

    assert visitor.post(LIST, expense_data(trip), format="json").status_code == 403
    assert visitor.patch(detail(expense), {"amount": "1.00"}, format="json").status_code == 403
    assert visitor.delete(detail(expense)).status_code == 403
    expense.refresh_from_db()
    assert expense.amount == Decimal("100.00")
    assert expense.rate_source == RateSource.NBR
