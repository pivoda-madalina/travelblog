import datetime
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from budget import views
from budget.rates import RateResult
from core.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

RATES = reverse("exchange-rate")


@pytest.fixture
def author():
    client = APIClient()
    client.force_login(UserFactory())
    return client


def test_author_gets_the_rate_for_the_expense_form(author, monkeypatch):
    asked = []

    def fake_rate(currency, on):
        asked.append((currency, on))
        return RateResult(Decimal("5.2364"), datetime.date(2026, 5, 8))

    monkeypatch.setattr(views, "nbr_rate", fake_rate)

    response = author.get(RATES, {"currency": "EUR", "date": "2026-05-10"})

    assert response.status_code == 200
    assert response.json() == {
        "currency": "EUR",
        "date": "2026-05-10",
        "rate": "5.236400",
        "rate_date": "2026-05-08",
        "detail": "",
    }
    assert asked == [("EUR", datetime.date(2026, 5, 10))]


def test_without_a_rate_the_author_is_asked_to_enter_one(author, monkeypatch):
    monkeypatch.setattr(views, "nbr_rate", lambda currency, on: RateResult(None, message="No."))

    response = author.get(RATES, {"currency": "XYZ", "date": "2026-05-10"})

    assert response.status_code == 200
    assert response.json()["rate"] is None
    assert response.json()["detail"] == "No."


def test_currency_and_date_are_checked(author):
    response = author.get(RATES, {"currency": "eur", "date": "10 May"})

    assert response.status_code == 400
    assert set(response.json()) == {"currency", "date"}


def test_br14_rates_are_for_the_author_only():
    response = APIClient().get(RATES, {"currency": "EUR", "date": "2026-05-10"})

    assert response.status_code == 403
