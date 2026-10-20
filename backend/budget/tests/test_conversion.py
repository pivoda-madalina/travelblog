"""US-12: each expense is converted to RON with a rate frozen on it (ADR 0003). BR-02 to BR-07.
The NBR lookup is replaced by a table of rates, so no test calls the network."""

import copy
import datetime
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from budget import conversion
from budget.conversion import UNCHANGED, convert
from budget.models import Expense, RateSource
from budget.rates import RateResult
from budget.tests.factories import ExpenseFactory
from trips.tests.factories import TripFactory

pytestmark = pytest.mark.django_db


def day(n: int) -> datetime.date:
    return datetime.date(2026, 5, n)


# RON per 1 unit, as the NBR would answer.
NBR_RATES = {
    ("EUR", day(12)): Decimal("4.975000"),
    ("EUR", day(13)): Decimal("4.980200"),
    ("USD", day(12)): Decimal("4.512300"),
}


@pytest.fixture(autouse=True)
def nbr(monkeypatch):
    asked = []

    def fake_rate(currency, on):
        asked.append((currency, on))
        rate = NBR_RATES.get((currency, on))
        if rate is None:
            return RateResult(None, message=f"No NBR rate for {currency}. Enter the rate paid.")
        return RateResult(rate, on)

    monkeypatch.setattr(conversion, "nbr_rate", fake_rate)
    return asked


def new_expense(**fields) -> Expense:
    return ExpenseFactory.build(
        **{"date": day(12), "amount": Decimal("100.00"), "currency": "EUR", **fields}
    )


def saved_expense(**fields) -> Expense:
    expense = new_expense(trip=TripFactory(), **fields)
    convert(expense, fields.get("rate"))
    expense.save()
    return expense


def edit(previous: Expense, rate=UNCHANGED, **changes) -> Expense:
    """The expense after an edit, converted the way the API converts it."""
    expense = copy.copy(previous)
    for field, value in changes.items():
        setattr(expense, field, value)
    convert(expense, rate, previous=previous)
    return expense


def test_br02_nbr_rate_filled_in_for_a_new_expense(nbr):
    expense = new_expense()

    convert(expense)

    assert (expense.rate, expense.rate_source) == (Decimal("4.975000"), RateSource.NBR)
    assert expense.amount_ron == Decimal("497.50")
    assert nbr == [("EUR", day(12))]


def test_br02_rate_refreshed_on_date_change(nbr):
    previous = saved_expense()

    expense = edit(previous, rate=None, date=day(13))

    assert (expense.rate, expense.rate_source) == (Decimal("4.980200"), RateSource.NBR)
    assert expense.amount_ron == Decimal("498.02")


def test_br02_rate_refreshed_on_currency_change():
    previous = saved_expense()

    expense = edit(previous, rate=None, currency="USD")

    assert (expense.rate, expense.rate_source) == (Decimal("4.512300"), RateSource.NBR)
    assert expense.amount_ron == Decimal("451.23")


def test_br02_date_change_replaces_a_manual_rate_left_out_of_the_edit():
    previous = saved_expense(rate=Decimal("5.100000"))

    expense = edit(previous, date=day(13))

    assert (expense.rate, expense.rate_source) == (Decimal("4.980200"), RateSource.NBR)


def test_br04_manual_rate_kept():
    previous = saved_expense(rate=Decimal("5.100000"))

    resent = edit(previous, rate=Decimal("5.100000"), description="Hotel")
    left_out = edit(previous, description="Hotel")

    for expense in (resent, left_out):
        assert (expense.rate, expense.rate_source) == (Decimal("5.100000"), RateSource.MANUAL)
        assert expense.amount_ron == Decimal("510.00")


def test_br04_typed_rate_replaces_the_nbr_rate(nbr):
    previous = saved_expense()

    expense = edit(previous, rate=Decimal("5.020000"))

    assert (expense.rate, expense.rate_source) == (Decimal("5.020000"), RateSource.MANUAL)
    assert expense.amount_ron == Decimal("502.00")


def test_br04_clearing_a_manual_rate_goes_back_to_the_nbr_rate():
    previous = saved_expense(rate=Decimal("5.100000"))

    expense = edit(previous, rate=None)

    assert (expense.rate, expense.rate_source) == (Decimal("4.975000"), RateSource.NBR)


def test_br04_rate_required_when_nbr_has_none():
    expense = new_expense(currency="VND")

    with pytest.raises(ValidationError) as error:
        convert(expense)

    assert error.value.message_dict == {"rate": ["No NBR rate for VND. Enter the rate paid."]}


def test_br04_rate_typed_when_nbr_has_none():
    expense = new_expense(currency="VND", amount=Decimal("1500000.00"))

    convert(expense, Decimal("0.000175"))

    assert expense.rate_source == RateSource.MANUAL
    assert expense.amount_ron == Decimal("262.50")


def test_br05_amount_change_uses_saved_rate(nbr, monkeypatch):
    previous = saved_expense()
    # The NBR would now answer differently, for example after publishing a late rate.
    monkeypatch.setitem(NBR_RATES, ("EUR", day(12)), Decimal("4.999900"))
    nbr.clear()

    expense = edit(previous, rate=None, amount=Decimal("50.00"))

    assert (expense.rate, expense.rate_source) == (Decimal("4.975000"), RateSource.NBR)
    assert expense.amount_ron == Decimal("248.75")
    assert nbr == []


def test_br06_ron_not_converted(nbr):
    expense = new_expense(currency="RON", amount=Decimal("120.45"))

    convert(expense, Decimal("4.9"))

    assert (expense.rate, expense.rate_source) == (Decimal("1"), RateSource.NBR)
    assert expense.amount_ron == Decimal("120.45")
    assert nbr == []


def test_br06_changing_to_ron_drops_the_rate():
    previous = saved_expense(rate=Decimal("5.100000"))

    expense = edit(previous, currency="RON")

    assert expense.rate == Decimal("1")
    assert expense.amount_ron == Decimal("100.00")


@pytest.mark.parametrize(
    ("amount", "rate", "amount_ron"),
    [
        (Decimal("1.00"), Decimal("4.125000"), Decimal("4.13")),
        (Decimal("1.00"), Decimal("4.135000"), Decimal("4.14")),
        (Decimal("1.00"), Decimal("4.124999"), Decimal("4.12")),
        (Decimal("33.33"), Decimal("4.976400"), Decimal("165.86")),
    ],
)
def test_br07_rounded_half_up(amount, rate, amount_ron):
    expense = new_expense(amount=amount)

    convert(expense, rate)

    assert expense.amount_ron == amount_ron
