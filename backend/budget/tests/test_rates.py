"""NBR rates (ADR 0003): BR-02 the rate for the expense date, BR-03 the most recent earlier rate
when none is published, BR-06 RON not converted. The NBR feeds are recorded XML files, trimmed
to four currencies, served with respx; tests never call the network."""

import datetime
import zoneinfo
from decimal import Decimal
from pathlib import Path

import httpx
import pytest
import respx

from budget import rates
from budget.models import ExchangeRate, ExchangeRateFetch
from budget.nbr import NbrUnavailable, parse
from budget.rates import RateResult, nbr_rate
from budget.tests.factories import ExchangeRateFactory

pytestmark = pytest.mark.django_db

FIXTURES = Path(__file__).parent / "fixtures"
RECENT = "https://curs.bnr.ro/nbrfxrates10days.xml"
BUCHAREST = zoneinfo.ZoneInfo("Europe/Bucharest")


def year_url(year: int) -> str:
    return f"https://curs.bnr.ro/files/xml/years/nbrfxrates{year}.xml"


def recorded(name: str) -> httpx.Response:
    return httpx.Response(200, content=(FIXTURES / name).read_bytes())


def set_clock(monkeypatch, *args):
    """Sets Bucharest time, for example `set_clock(monkeypatch, 2026, 10, 19, 15)`."""
    monkeypatch.setattr(rates, "local_now", lambda: datetime.datetime(*args, tzinfo=BUCHAREST))


@pytest.fixture(autouse=True)
def monday_afternoon(monkeypatch):
    # The recorded ten-day feed was fetched on Monday 19 October 2026; its last rate is Friday's.
    set_clock(monkeypatch, 2026, 10, 19, 15)


@pytest.fixture
def nbr():
    with respx.mock(assert_all_called=False) as mock:
        mock.get(RECENT).mock(return_value=recorded("nbrfxrates10days.xml"))
        mock.get(year_url(2025)).mock(return_value=recorded("nbrfxrates2025.xml"))
        mock.get(year_url(2026)).mock(return_value=recorded("nbrfxrates2026.xml"))
        yield mock


def test_br02_banking_day_uses_its_own_rate(nbr):
    assert nbr_rate("EUR", datetime.date(2026, 5, 11)) == RateResult(
        Decimal("5.222200"), datetime.date(2026, 5, 11)
    )


def test_br03_weekend_uses_previous_rate(nbr):
    # Sunday 10 May 2026: Friday's rate.
    assert nbr_rate("EUR", datetime.date(2026, 5, 10)) == RateResult(
        Decimal("5.236400"), datetime.date(2026, 5, 8)
    )


def test_br03_holiday_at_new_year_uses_the_previous_year_rate(nbr):
    # The NBR published nothing from 1 to 4 January 2026.
    result = nbr_rate("EUR", datetime.date(2026, 1, 2))

    assert result == RateResult(Decimal("5.098500"), datetime.date(2025, 12, 31))
    assert nbr.routes[1].called and nbr.routes[2].called


def test_br03_future_date_uses_latest_rate(nbr):
    result = nbr_rate("USD", datetime.date(2030, 1, 1))

    assert result.rate_date == datetime.date(2026, 10, 16)
    assert result.rate == ExchangeRate.objects.get(currency="USD", date=result.rate_date).rate
    assert nbr.routes[0].called and not nbr.routes[2].called


@pytest.mark.parametrize(
    ("currency", "rate"),
    [("HUF", Decimal("0.014731")), ("JPY", Decimal("0.028395")), ("USD", Decimal("4.449300"))],
)
def test_rates_published_per_100_units_are_saved_per_unit(nbr, currency, rate):
    assert nbr_rate(currency, datetime.date(2026, 5, 8)).rate == rate
    assert ExchangeRate.objects.get(currency=currency, date=datetime.date(2026, 5, 8)).rate == rate


def test_br06_ron_is_not_converted():
    # No respx routes: any request would fail the test.
    with respx.mock:
        assert nbr_rate("RON", datetime.date(2026, 5, 10)) == RateResult(
            Decimal("1"), datetime.date(2026, 5, 10)
        )


def test_each_date_is_fetched_once(nbr):
    nbr_rate("EUR", datetime.date(2026, 10, 18))
    nbr_rate("USD", datetime.date(2026, 10, 18))
    nbr_rate("EUR", datetime.date(2026, 10, 12))
    nbr_rate("EUR", datetime.date(2026, 5, 10))
    nbr_rate("EUR", datetime.date(2026, 3, 2))

    assert nbr.routes[0].call_count == 1  # the ten-day feed
    assert nbr.routes[2].call_count == 1  # the 2026 file


def test_today_is_asked_for_again_until_its_rate_is_published(nbr, monkeypatch):
    set_clock(monkeypatch, 2026, 10, 19, 10)  # Monday morning, before the 13:00 publication

    first = nbr_rate("EUR", datetime.date(2026, 10, 19))
    nbr_rate("EUR", datetime.date(2026, 10, 19))
    nbr_rate("EUR", datetime.date(2026, 10, 18))  # Sunday is final

    assert first.rate_date == datetime.date(2026, 10, 16)
    assert nbr.routes[0].call_count == 2


def test_a_weekend_day_is_final_once_fetched(nbr, monkeypatch):
    set_clock(monkeypatch, 2026, 10, 17, 9)  # Saturday morning

    nbr_rate("EUR", datetime.date(2026, 10, 17))
    nbr_rate("EUR", datetime.date(2026, 10, 17))

    assert nbr.routes[0].call_count == 1


def test_unknown_currency_has_no_rate(nbr):
    result = nbr_rate("XYZ", datetime.date(2026, 5, 11))

    assert result == RateResult(
        None,
        message="The National Bank of Romania publishes no rate for XYZ. Enter the rate paid.",
    )


def test_a_currency_no_longer_published_has_no_rate(nbr):
    ExchangeRateFactory(currency="ABC", date=datetime.date(2026, 3, 2))

    assert nbr_rate("ABC", datetime.date(2026, 5, 11)).rate is None


@pytest.mark.parametrize(
    "failure",
    [
        httpx.Response(500),
        # The NBR sends moved files and blocked requests to its home page.
        httpx.Response(302, headers={"Location": "https://www.bnr.ro/"}),
        httpx.Response(200, text="<!doctype html><html><p>BNR</p></html>"),
        httpx.Response(200, text="not xml at all"),
        httpx.ReadTimeout("timed out"),
        httpx.ConnectError("no network"),
    ],
)
def test_service_unavailable_gives_no_rate(failure):
    with respx.mock:
        route = respx.get(year_url(2026))
        if isinstance(failure, Exception):
            route.mock(side_effect=failure)
        else:
            route.mock(return_value=failure)

        result = nbr_rate("EUR", datetime.date(2026, 5, 11))

    assert result == RateResult(
        None,
        message="The National Bank of Romania rates could not be loaded. Enter the rate paid.",
    )
    assert not ExchangeRate.objects.exists()


def test_xml_entities_are_refused():
    bomb = b'<?xml version="1.0"?><!DOCTYPE d [<!ENTITY a "aaaa">]><DataSet>&a;</DataSet>'

    with pytest.raises(NbrUnavailable):
        parse(bomb)


def test_cube_with_an_invalid_rate_is_refused():
    xml = b'<DataSet><Cube date="2026-05-11"><Rate currency="EUR">n/a</Rate></Cube></DataSet>'

    with pytest.raises(NbrUnavailable):
        parse(xml)


def test_a_feed_without_rates_is_refused():
    with pytest.raises(NbrUnavailable, match="no rates"):
        parse(b'<DataSet xmlns="https://www.bnr.ro/xsd"><Body></Body></DataSet>')


def test_the_clock_is_bucharest_time(monkeypatch):
    monkeypatch.undo()

    assert rates.local_now().tzinfo.key == "Europe/Bucharest"


def test_fetched_ranges_are_logged(nbr):
    nbr_rate("EUR", datetime.date(2026, 5, 11))

    assert [str(fetch) for fetch in ExchangeRateFetch.objects.all()] == [
        "NBR rates 2026-01-01 to 2026-10-19"
    ]
