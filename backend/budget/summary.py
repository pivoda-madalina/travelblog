"""A trip's budget summary in RON (US-13, BR-01)."""

from dataclasses import dataclass
from decimal import Decimal

from django.db.models import Sum

from budget.models import Category
from trips.models import Trip

ZERO = Decimal("0.00")


@dataclass(frozen=True)
class CategoryTotal:
    category: Category
    spent: Decimal


@dataclass(frozen=True)
class BudgetSummary:
    planned: Decimal | None
    spent: Decimal
    categories: list[CategoryTotal]

    @property
    def difference(self) -> Decimal | None:
        """Planned minus spent, negative when over budget; None without a planned budget."""
        return None if self.planned is None else self.planned - self.spent

    @property
    def over_budget(self) -> bool:
        return self.planned is not None and self.spent > self.planned


def budget_summary(trip: Trip) -> BudgetSummary:
    """Totals of the stored, already rounded `amount_ron` values, so they add up to what the
    expense table shows (BR-07). Every category is listed, largest first, empty ones as zero."""
    rows = trip.expenses.values("category").annotate(spent=Sum("amount_ron"))
    spent_by_category = {row["category"]: row["spent"] for row in rows}
    categories = [
        CategoryTotal(category, spent_by_category.get(category, ZERO)) for category in Category
    ]
    # sorted() is stable, so equal totals keep the fixed order of BR-08.
    categories = sorted(categories, key=lambda total: total.spent, reverse=True)
    return BudgetSummary(
        planned=trip.planned_budget,
        spent=sum((total.spent for total in categories), ZERO),
        categories=categories,
    )
