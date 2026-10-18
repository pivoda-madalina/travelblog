from decimal import Decimal

import factory

from places.models import City, Place
from trips.tests.factories import TripFactory


class CityFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = City

    name = factory.Sequence(lambda n: f"City {n}")
    country_code = "RO"
    country_name = "Romania"
    latitude = Decimal("44.426800")
    longitude = Decimal("26.102500")


class PlaceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Place

    trip = factory.SubFactory(TripFactory)
    city = factory.SubFactory(CityFactory)
    visited_on = factory.LazyAttribute(lambda place: place.trip.start_date)
    position = factory.Sequence(lambda n: n)
