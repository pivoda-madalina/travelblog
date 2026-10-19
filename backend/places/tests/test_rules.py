"""BR-09: places are dated within their trip. BR-12: the same city is shared between trips."""

import datetime
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from places.models import City, Place
from places.tests.factories import PlaceFactory
from trips.tests.factories import TripFactory

pytestmark = pytest.mark.django_db


def day(n: int) -> datetime.date:
    return datetime.date(2026, 5, n)


@pytest.mark.parametrize("visited_on", [day(11), day(21)])
def test_br09_place_date_within_trip(visited_on):
    trip = TripFactory(start_date=day(12), end_date=day(20))
    place = PlaceFactory.build(trip=trip, visited_on=visited_on)

    with pytest.raises(ValidationError) as error:
        place.clean()

    assert error.value.message_dict == {
        "visited_on": ["The visit date must be within the trip, 12 May 2026 to 20 May 2026."]
    }


@pytest.mark.parametrize("visited_on", [day(12), day(16), day(20)])
def test_br09_place_on_the_first_last_or_any_trip_day_is_allowed(visited_on):
    trip = TripFactory(start_date=day(12), end_date=day(20))

    PlaceFactory.build(trip=trip, visited_on=visited_on).clean()


def test_missing_trip_or_date_is_left_to_the_required_field_errors():
    Place().clean()


def rome(**overrides):
    fields = {
        "name": "Rome",
        "country_code": "IT",
        "country_name": "Italy",
        "latitude": Decimal("41.902800"),
        "longitude": Decimal("12.496400"),
        **overrides,
    }
    return City.objects.find_or_create(**fields)


def test_br12_same_city_reused():
    first = rome()

    again = rome(name="rome", latitude=Decimal("41.890000"), longitude=Decimal("12.490000"))

    assert again == first
    assert again.latitude == Decimal("41.902800")
    assert City.objects.count() == 1


def test_br12_same_name_in_another_country_is_another_city():
    italy = rome()

    texas = rome(country_code="US", country_name="United States")

    assert texas != italy
    assert City.objects.count() == 2
