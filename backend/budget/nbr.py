"""Client for the National Bank of Romania reference rates XML feeds (ADR 0003).

Two feeds are used: the last ten banking days, and one file per year. Rates are returned in RON
per 1 unit: the NBR publishes some currencies per 100 units (`multiplier="100"`), so those are
divided here. Any failure raises NbrUnavailable.
"""

import datetime
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

import httpx
from defusedxml import ElementTree
from defusedxml.common import DefusedXmlException
from django.conf import settings

RATE_PLACES = Decimal("0.000001")


class NbrUnavailable(Exception):
    """The feed could not be loaded or read."""


@dataclass(frozen=True)
class Rate:
    date: datetime.date
    currency: str
    rate: Decimal


@dataclass(frozen=True)
class Feed:
    """The rates of one file, and the first and last dates it has rates for."""

    rates: list[Rate]
    first_date: datetime.date
    last_date: datetime.date


def fetch_recent() -> Feed:
    """The last ten banking days."""
    return _fetch(f"{settings.NBR_URL}/nbrfxrates10days.xml")


def fetch_year(year: int) -> Feed:
    """Every banking day of the year so far."""
    return _fetch(f"{settings.NBR_URL}/files/xml/years/nbrfxrates{year}.xml")


def _fetch(url: str) -> Feed:
    try:
        response = httpx.get(url, timeout=settings.NBR_TIMEOUT_SECONDS)
        # Redirects are not followed and count as failures: the NBR sends moved files, and
        # requests it blocks, to its home page.
        response.raise_for_status()
        return parse(response.content)
    except httpx.HTTPError as error:
        raise NbrUnavailable(f"The NBR feed {url} could not be loaded.") from error


def parse(xml: bytes) -> Feed:
    try:
        root = ElementTree.fromstring(xml)
        rates = [
            Rate(
                date=datetime.date.fromisoformat(cube.attrib["date"]),
                currency=element.attrib["currency"],
                rate=(
                    Decimal(element.text or "") / Decimal(element.attrib.get("multiplier", "1"))
                ).quantize(RATE_PLACES, rounding=ROUND_HALF_UP),
            )
            # `{*}` matches any namespace; the NBR changed its namespace URL in 2026.
            for cube in root.iterfind(".//{*}Cube")
            for element in cube.iterfind("{*}Rate")
        ]
    except (
        ElementTree.ParseError,
        DefusedXmlException,
        KeyError,
        ValueError,
        InvalidOperation,
    ) as error:
        raise NbrUnavailable("The NBR feed could not be read.") from error
    if not rates:
        raise NbrUnavailable("The NBR feed has no rates.")
    dates = [rate.date for rate in rates]
    return Feed(rates=rates, first_date=min(dates), last_date=max(dates))
