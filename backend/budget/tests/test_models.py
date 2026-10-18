from decimal import Decimal

import pytest
from django.db import IntegrityError

from budget.models import Category
from budget.tests.factories import ExchangeRateFactory, ExpenseFactory

pytestmark = pytest.mark.django_db


def test_br08_expense_categories():
    assert Category.labels == [
        "Transport",
        "Accommodation",
        "Food and drinks",
        "Activities",
        "Shopping",
        "Other",
    ]


def test_br08_expense_category_outside_the_list_is_refused():
    with pytest.raises(IntegrityError):
        ExpenseFactory(category="souvenirs")


@pytest.mark.parametrize("amount", [Decimal("0.00"), Decimal("-5.00")])
def test_expense_amount_must_be_greater_than_zero(amount):
    with pytest.raises(IntegrityError):
        ExpenseFactory(amount=amount)


def test_expense_rate_must_be_greater_than_zero():
    with pytest.raises(IntegrityError):
        ExpenseFactory(rate=Decimal("0"))


def test_expense_keeps_money_as_decimal():
    expense = ExpenseFactory(amount=Decimal("12.35"), rate=Decimal("0.012345"))
    expense.refresh_from_db()

    assert expense.amount == Decimal("12.35")
    assert expense.rate == Decimal("0.012345")
    assert str(expense) == f"{expense.description}: 12.35 EUR"


def test_exchange_rate_is_unique_per_currency_and_date():
    rate = ExchangeRateFactory()

    with pytest.raises(IntegrityError):
        ExchangeRateFactory(currency=rate.currency, date=rate.date)


def test_exchange_rate_name():
    rate = ExchangeRateFactory(currency="USD", rate=Decimal("4.512300"))

    assert str(rate) == f"USD {rate.date}: 4.512300"
