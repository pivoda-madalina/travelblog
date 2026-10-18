import pytest
from django.db import IntegrityError
from django.db.models import ProtectedError

from places.tests.factories import CityFactory, PlaceFactory

pytestmark = pytest.mark.django_db


def test_city_is_unique_per_name_and_country():
    CityFactory(name="Paris", country_code="FR", country_name="France")

    with pytest.raises(IntegrityError):
        CityFactory(name="Paris", country_code="FR", country_name="France")


def test_same_city_name_is_allowed_in_another_country():
    CityFactory(name="Paris", country_code="FR", country_name="France")

    city = CityFactory(name="Paris", country_code="US", country_name="United States")

    assert str(city) == "Paris, United States"


def test_city_used_by_a_place_cannot_be_deleted():
    place = PlaceFactory()

    with pytest.raises(ProtectedError):
        place.city.delete()


def test_places_are_ordered_by_route_position():
    first = PlaceFactory(position=2)
    second = PlaceFactory(trip=first.trip, position=1)

    assert list(first.trip.places.all()) == [second, first]
    assert str(second) == f"{second.city.name} on {second.visited_on}"
