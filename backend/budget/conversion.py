"""Converts an expense to RON, the one place that sets its rate and `amount_ron` (ADR 0003)."""

import enum
from decimal import ROUND_HALF_UP, Decimal

from django.core.exceptions import ValidationError

from budget.models import Expense, RateSource
from budget.rates import HOME_CURRENCY, nbr_rate

CENT = Decimal("0.01")


class _Unchanged(enum.Enum):
    """The rate was not sent at all, as in a PATCH of the amount only."""

    UNCHANGED = enum.auto()


UNCHANGED = _Unchanged.UNCHANGED


def convert(
    expense: Expense,
    rate: Decimal | None | _Unchanged = None,
    previous: Expense | None = None,
) -> None:
    """Sets the expense's rate, its source and the converted amount.

    `rate` is the rate the author typed, None for "use the NBR rate", or UNCHANGED when it was
    not sent. `previous` is the expense as saved, when editing.

    - RON is not converted (BR-06).
    - A typed rate is used as it is (BR-04).
    - The saved rate is kept while the date and currency stay the same (BR-05): an NBR rate
      always, a manual one unless the author cleared it.
    - Otherwise the NBR rate for the date is looked up (BR-02, BR-03); without one the author
      is asked for it (BR-04).
    """
    if expense.currency == HOME_CURRENCY:
        expense.rate, expense.rate_source = Decimal("1"), RateSource.NBR
    elif rate is not None and rate is not UNCHANGED:
        expense.rate, expense.rate_source = rate, RateSource.MANUAL
    elif _keeps_saved_rate(previous, expense, cleared=rate is None):
        expense.rate, expense.rate_source = previous.rate, previous.rate_source
    else:
        result = nbr_rate(expense.currency, expense.date)
        if result.rate is None:
            raise ValidationError({"rate": result.message})
        expense.rate, expense.rate_source = result.rate, RateSource.NBR
    expense.amount_ron = to_ron(expense.amount, expense.rate)


def to_ron(amount: Decimal, rate: Decimal) -> Decimal:
    """Rounded to the cent, half up; totals add up these rounded amounts (BR-07)."""
    return (amount * rate).quantize(CENT, rounding=ROUND_HALF_UP)


def _keeps_saved_rate(previous: Expense | None, expense: Expense, *, cleared: bool) -> bool:
    if previous is None or (previous.date, previous.currency) != (expense.date, expense.currency):
        return False
    return previous.rate_source == RateSource.NBR or not cleared
