"""Converts an expense to RON, the one place that sets its rate and `amount_ron` (ADR 0003).

The rules for keeping or refreshing a saved rate (BR-02, BR-05) arrive with US-12 (#17); for now
every save takes the rate the author typed, or else the NBR rate for the expense date.
"""

from decimal import ROUND_HALF_UP, Decimal

from django.core.exceptions import ValidationError

from budget.models import Expense, RateSource
from budget.rates import HOME_CURRENCY, nbr_rate

CENT = Decimal("0.01")


def convert(expense: Expense, rate: Decimal | None = None) -> None:
    """Sets the expense's rate, its source and the converted amount. A typed `rate` is used as
    it is (BR-04); without one the NBR rate is looked up (BR-02, BR-03), and if there is none
    the author is asked for it. RON is not converted (BR-06)."""
    if expense.currency == HOME_CURRENCY:
        expense.rate, expense.rate_source = Decimal("1"), RateSource.NBR
    elif rate is not None:
        expense.rate, expense.rate_source = rate, RateSource.MANUAL
    else:
        result = nbr_rate(expense.currency, expense.date)
        if result.rate is None:
            raise ValidationError({"rate": result.message})
        expense.rate, expense.rate_source = result.rate, RateSource.NBR
    # Rounded to the cent, half up (BR-07).
    expense.amount_ron = (expense.amount * expense.rate).quantize(CENT, rounding=ROUND_HALF_UP)
