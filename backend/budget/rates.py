"""The RON rate for a currency on a date (BR-02, BR-03, BR-06), from the NBR rates cached in
`ExchangeRate`. A date is fetched from the NBR only the first time it is asked for."""

import datetime
from dataclasses import dataclass
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from budget import nbr
from budget.models import ExchangeRate, ExchangeRateFetch

HOME_CURRENCY = "RON"

# The ten-day feed covers about two weeks; older dates come from the yearly file.
RECENT_DAYS = 9
# The NBR publishes the day's rates at about 13:00; after this hour none will follow.
PUBLISHED_BY_HOUR = 14
# The longest run of days without a rate is the winter holidays. A rate older than this means
# the NBR no longer publishes the currency.
MAX_RATE_AGE = datetime.timedelta(days=14)


@dataclass(frozen=True)
class RateResult:
    """`rate` is None when there is no rate; `message` then says why, for the author (BR-04)."""

    rate: Decimal | None
    rate_date: datetime.date | None = None
    message: str = ""


def local_now() -> datetime.datetime:
    """Bucharest time. A function, so tests can set the clock."""
    return timezone.localtime()


def nbr_rate(currency: str, on: datetime.date) -> RateResult:
    """The NBR rate for `on`, or the most recent earlier one for weekends, holidays and future
    dates (BR-03). RON is not converted (BR-06)."""
    if currency == HOME_CURRENCY:
        return RateResult(Decimal("1"), on)
    now = local_now()
    target = min(on, now.date())
    try:
        row = _cached_rate(currency, target, now)
        # The first days of January have no rate yet, so the year before supplies it.
        if not _is_current(row, target):
            row = _cached_rate(currency, datetime.date(target.year - 1, 12, 31), now) or row
    except nbr.NbrUnavailable:
        return RateResult(
            None,
            message="The National Bank of Romania rates could not be loaded. Enter the rate paid.",
        )
    if row is None or not _is_current(row, target):
        return RateResult(
            None,
            message=f"The National Bank of Romania publishes no rate for {currency}. "
            "Enter the rate paid.",
        )
    return RateResult(row.rate, row.date)


def _is_current(row: ExchangeRate | None, target: datetime.date) -> bool:
    return row is not None and target - row.date <= MAX_RATE_AGE


def _cached_rate(
    currency: str, target: datetime.date, now: datetime.datetime
) -> ExchangeRate | None:
    if not ExchangeRateFetch.objects.filter(start_date__lte=target, end_date__gte=target).exists():
        _fetch_covering(target, now)
    return (
        ExchangeRate.objects.filter(currency=currency, date__lte=target).order_by("-date").first()
    )


def _fetch_covering(target: datetime.date, now: datetime.datetime) -> None:
    today = now.date()
    if target >= today - datetime.timedelta(days=RECENT_DAYS):
        feed = nbr.fetch_recent()
        start, is_latest = feed.first_date, True
    else:
        feed = nbr.fetch_year(target.year)
        start, is_latest = datetime.date(target.year, 1, 1), target.year == today.year
    if not is_latest:
        end = datetime.date(target.year, 12, 31)
    elif feed.last_date == today or now.hour >= PUBLISHED_BY_HOUR or today.weekday() >= 5:
        # Today is final: published, past the publishing hour, or a weekend.
        end = today
    else:
        # Today's rate may still come, so today stays uncovered and is asked for again.
        end = max(feed.last_date, today - datetime.timedelta(days=1))
    with transaction.atomic():
        ExchangeRate.objects.bulk_create(
            [ExchangeRate(currency=r.currency, date=r.date, rate=r.rate) for r in feed.rates],
            ignore_conflicts=True,
        )
        ExchangeRateFetch.objects.create(start_date=start, end_date=end)
