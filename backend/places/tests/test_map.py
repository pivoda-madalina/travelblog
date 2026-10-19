"""BR-12: one pin per city. BR-13: the world map shows only places of published trips visited
today or earlier."""

import datetime

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from core.tests.factories import UserFactory
from places.models import Place
from places.tests.factories import CityFactory, PlaceFactory
from trips.models import Trip
from trips.tests.factories import TripFactory

pytestmark = pytest.mark.django_db

MAP = reverse("world-map")


def days_from_today(n: int) -> datetime.date:
    return timezone.localdate() + datetime.timedelta(days=n)


def trip_around(start: int, end: int, **fields) -> Trip:
    return TripFactory(start_date=days_from_today(start), end_date=days_from_today(end), **fields)


@pytest.fixture
def visitor():
    return APIClient()


def test_br13_map_excludes_drafts():
    PlaceFactory(trip=trip_around(-10, -5, status=Trip.Status.DRAFT))
    published = PlaceFactory(trip=trip_around(-30, -25))

    assert list(Place.objects.on_world_map()) == [published]


def test_br13_map_excludes_future_visits():
    trip = trip_around(-2, 2)
    yesterday = PlaceFactory(trip=trip, visited_on=days_from_today(-1))
    today = PlaceFactory(trip=trip, visited_on=days_from_today(0))
    PlaceFactory(trip=trip, visited_on=days_from_today(1))
    PlaceFactory(trip=trip_around(30, 35))

    assert set(Place.objects.on_world_map()) == {yesterday, today}


def test_br12_one_pin_per_city(visitor):
    rome = CityFactory(name="Rome", country_code="IT", country_name="Italy")
    weekend = trip_around(-400, -398, title="Weekend in Rome")
    amalfi = trip_around(-20, -12, title="Rome and the Amalfi Coast")
    PlaceFactory(trip=weekend, city=rome, visited_on=days_from_today(-400))
    PlaceFactory(trip=amalfi, city=rome, visited_on=days_from_today(-20))
    # Back in Rome at the end of the same trip: the trip is listed once, with its first visit.
    PlaceFactory(trip=amalfi, city=rome, visited_on=days_from_today(-12))

    cities = visitor.get(MAP).json()["cities"]

    assert len(cities) == 1
    assert cities[0]["name"] == "Rome"
    assert cities[0]["visits"] == [
        {
            "trip": amalfi.pk,
            "title": "Rome and the Amalfi Coast",
            "visited_on": str(days_from_today(-20)),
        },
        {"trip": weekend.pk, "title": "Weekend in Rome", "visited_on": str(days_from_today(-400))},
    ]


def test_map_lists_cities_and_visited_countries(visitor):
    trip = trip_around(-10, -5)
    lisbon = CityFactory(name="Lisbon", country_code="PT", country_name="Portugal")
    PlaceFactory(trip=trip, city=lisbon, visited_on=days_from_today(-10))
    PlaceFactory(trip=trip, city=CityFactory(name="Rome", country_code="IT"))
    PlaceFactory(trip=trip, city=CityFactory(name="Naples", country_code="IT"))
    # A planned place does not light up its country (BR-13).
    PlaceFactory(trip=trip_around(30, 35), city=CityFactory(country_code="JP"))

    body = visitor.get(MAP).json()

    assert body["countries"] == ["IT", "PT"]
    assert [city["name"] for city in body["cities"]] == ["Lisbon", "Naples", "Rome"]
    assert body["cities"][0] | {"visits": None} == {
        "id": lisbon.pk,
        "name": "Lisbon",
        "country_code": "PT",
        "country_name": "Portugal",
        "latitude": "44.426800",
        "longitude": "26.102500",
        "visits": None,
    }


def test_br13_author_sees_the_same_public_map(visitor):
    PlaceFactory(trip=trip_around(-10, -5, status=Trip.Status.DRAFT))
    author = APIClient()
    author.force_login(UserFactory())

    assert author.get(MAP).json() == visitor.get(MAP).json() == {"countries": [], "cities": []}
