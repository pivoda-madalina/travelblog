"""BR-14: visitors cannot see draft trips, budgets or expenses, and cannot change any content."""

from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from budget.tests.factories import ExpenseFactory
from core.tests.factories import UserFactory
from core.tests.visitor import REFUSED, VISITOR_WRITES_ALLOWED, api_urls, visitor_write_responses
from places.tests.factories import PlaceFactory
from trips.models import Trip
from trips.tests.factories import TripFactory

pytestmark = [pytest.mark.django_db, pytest.mark.urls("core.tests.sample_api")]


@pytest.fixture
def visitor():
    return APIClient()


@pytest.fixture
def author():
    client = APIClient()
    client.force_login(UserFactory())
    return client


@pytest.fixture
def draft():
    return TripFactory(status=Trip.Status.DRAFT)


@pytest.fixture
def published():
    return TripFactory(status=Trip.Status.PUBLISHED)


def ids(response):
    return {item["id"] for item in response.json()}


def test_br14_visitor_cannot_write():
    urls = api_urls()
    assert "sample-trip-detail" in urls, "the walk must reach routed viewsets"

    responses = {
        name: visitor_write_responses(url)
        for name, url in urls.items()
        if name not in VISITOR_WRITES_ALLOWED
    }

    accepted = {name: codes for name, codes in responses.items() if set(codes.values()) - REFUSED}
    assert accepted == {}


def test_br14_visitor_write_changes_nothing(visitor, published):
    visitor.patch(reverse("sample-trip-detail", args=[published.pk]), {"title": "Hacked"})
    visitor.delete(reverse("sample-trip-detail", args=[published.pk]))
    visitor.post(reverse("sample-trip-list"), {"title": "New"})

    assert list(Trip.objects.values_list("title", flat=True)) == [published.title]


def test_author_can_write(author, published):
    response = author.patch(
        reverse("sample-trip-detail", args=[published.pk]), {"title": "Renamed"}, format="json"
    )

    assert response.status_code == 200


def test_br14_visitor_cannot_see_drafts(visitor, draft, published):
    draft_place = PlaceFactory(trip=draft)
    published_place = PlaceFactory(trip=published)

    assert ids(visitor.get(reverse("sample-trip-list"))) == {published.pk}
    assert visitor.get(reverse("sample-trip-detail", args=[draft.pk])).status_code == 404
    assert ids(visitor.get(reverse("sample-place-list"))) == {published_place.pk}
    assert visitor.get(reverse("sample-place-detail", args=[draft_place.pk])).status_code == 404


def test_br14_draft_and_missing_trip_look_the_same_to_visitors(visitor, draft):
    for_draft = visitor.get(reverse("sample-trip-detail", args=[draft.pk]))
    for_missing = visitor.get(reverse("sample-trip-detail", args=[draft.pk + 1000]))

    assert for_draft.status_code == for_missing.status_code == 404
    assert for_draft.json() == for_missing.json()


def test_author_sees_drafts(author, draft, published):
    draft_place = PlaceFactory(trip=draft)

    assert ids(author.get(reverse("sample-trip-list"))) == {draft.pk, published.pk}
    assert author.get(reverse("sample-trip-detail", args=[draft.pk])).status_code == 200
    assert author.get(reverse("sample-place-detail", args=[draft_place.pk])).status_code == 200


def test_br14_visitor_cannot_see_budget(visitor, published):
    published.planned_budget = Decimal("5000.00")
    published.save()
    expense = ExpenseFactory(trip=published)

    trip = visitor.get(reverse("sample-trip-detail", args=[published.pk])).json()
    assert "planned_budget" not in trip
    assert visitor.get(reverse("sample-expense-list")).status_code == 403
    assert visitor.get(reverse("sample-expense-detail", args=[expense.pk])).status_code == 403


def test_author_sees_budget(author, published):
    published.planned_budget = Decimal("5000.00")
    published.save()
    ExpenseFactory(trip=published)

    trip = author.get(reverse("sample-trip-detail", args=[published.pk])).json()
    assert trip["planned_budget"] == "5000.00"
    assert len(author.get(reverse("sample-expense-list")).json()) == 1
