import datetime
from decimal import Decimal

import httpx
import pytest
import respx
from django.urls import reverse
from rest_framework.test import APIClient

from core.tests.factories import UserFactory
from places.models import City, Place
from places.tests.factories import CityFactory, PlaceFactory
from trips.models import Trip
from trips.tests.factories import TripFactory

pytestmark = pytest.mark.django_db

LIST = reverse("place-list")
REORDER = reverse("place-reorder")
GEOCODE = reverse("geocode-reverse")


@pytest.fixture
def visitor():
    return APIClient()


@pytest.fixture
def author():
    client = APIClient()
    client.force_login(UserFactory())
    return client


@pytest.fixture
def trip():
    return TripFactory(start_date=datetime.date(2026, 5, 12), end_date=datetime.date(2026, 5, 20))


def place_data(trip, **overrides):
    return {
        "trip": trip.pk,
        "name": "Positano",
        "country_code": "IT",
        "country_name": "Italy",
        "latitude": "40.628100",
        "longitude": "14.484900",
        "visited_on": "2026-05-17",
        **overrides,
    }


def route(trip, client):
    return [place["city"]["name"] for place in client.get(LIST, {"trip": trip.pk}).json()]


def test_author_adds_a_place_and_its_city_is_created(author, trip):
    response = author.post(LIST, place_data(trip), format="json")

    assert response.status_code == 201
    assert response.json()["city"] == {
        "id": City.objects.get().pk,
        "name": "Positano",
        "country_code": "IT",
        "country_name": "Italy",
        "latitude": "40.628100",
        "longitude": "14.484900",
    }
    assert response.json()["visited_on"] == "2026-05-17"


def test_new_places_go_to_the_end_of_the_route(author, trip):
    PlaceFactory(trip=trip, position=4, city=CityFactory(name="Rome"))

    response = author.post(LIST, place_data(trip), format="json")

    assert response.json()["position"] == 5
    assert route(trip, author) == ["Rome", "Positano"]


def test_br12_same_city_reused_through_the_api(author, trip):
    other_trip = TripFactory()
    PlaceFactory(trip=other_trip, city=CityFactory(name="Positano", country_code="IT"))

    author.post(LIST, place_data(trip), format="json")

    assert City.objects.count() == 1
    assert Place.objects.filter(city__name="Positano").count() == 2


def test_br09_place_outside_the_trip_is_refused(author, trip):
    response = author.post(LIST, place_data(trip, visited_on="2026-05-21"), format="json")

    assert response.status_code == 400
    assert response.json() == {
        "visited_on": ["The visit date must be within the trip, 12 May 2026 to 20 May 2026."]
    }
    assert not City.objects.exists()


@pytest.mark.parametrize(
    ("field", "value"),
    [("country_code", "Italy"), ("latitude", "91"), ("longitude", "-181"), ("name", "")],
)
def test_invalid_place_fields_are_refused(author, trip, field, value):
    response = author.post(LIST, place_data(trip, **{field: value}), format="json")

    assert response.status_code == 400
    assert field in response.json()


def test_places_are_listed_per_trip_in_route_order(visitor, trip):
    PlaceFactory(trip=trip, position=2, city=CityFactory(name="Naples"))
    PlaceFactory(trip=trip, position=1, city=CityFactory(name="Rome"))
    PlaceFactory(city=CityFactory(name="Lisbon"))

    assert route(trip, visitor) == ["Rome", "Naples"]


def test_br14_places_of_a_draft_are_hidden_from_visitors(visitor, author):
    draft = TripFactory(status=Trip.Status.DRAFT)
    PlaceFactory(trip=draft)

    assert visitor.get(LIST, {"trip": draft.pk}).json() == []
    assert len(author.get(LIST, {"trip": draft.pk}).json()) == 1


def test_br14_visitor_cannot_add_a_place(visitor, trip):
    response = visitor.post(LIST, place_data(trip), format="json")

    assert response.status_code == 403
    assert not Place.objects.exists()


def test_author_reorders_the_route_in_one_request(author, trip):
    rome = PlaceFactory(trip=trip, position=0, city=CityFactory(name="Rome"))
    naples = PlaceFactory(trip=trip, position=1, city=CityFactory(name="Naples"))
    positano = PlaceFactory(trip=trip, position=2, city=CityFactory(name="Positano"))

    response = author.post(
        REORDER, {"trip": trip.pk, "places": [positano.pk, rome.pk, naples.pk]}, format="json"
    )

    assert response.status_code == 200
    assert [place["city"]["name"] for place in response.json()] == ["Positano", "Rome", "Naples"]
    assert route(trip, author) == ["Positano", "Rome", "Naples"]


@pytest.mark.parametrize("which", ["missing", "repeated", "other trip"])
def test_reorder_must_list_every_place_of_the_trip_once(author, trip, which):
    first = PlaceFactory(trip=trip)
    second = PlaceFactory(trip=trip)
    ids = {
        "missing": [first.pk],
        "repeated": [first.pk, second.pk, first.pk],
        "other trip": [first.pk, second.pk, PlaceFactory().pk],
    }[which]

    response = author.post(REORDER, {"trip": trip.pk, "places": ids}, format="json")

    assert response.status_code == 400
    assert response.json() == {"places": ["List every place of the trip once."]}


def test_author_deletes_a_place_and_the_city_stays(author, trip):
    place = PlaceFactory(trip=trip)

    response = author.delete(reverse("place-detail", args=[place.pk]))

    assert response.status_code == 204
    assert not Place.objects.exists()
    assert City.objects.filter(pk=place.city_id).exists()


@respx.mock
def test_geocode_returns_the_city_at_the_clicked_point(author):
    respx.get("https://nominatim.openstreetmap.org/reverse").mock(
        return_value=httpx.Response(
            200, json={"address": {"town": "Positano", "country": "Italy", "country_code": "it"}}
        )
    )

    response = author.get(GEOCODE, {"lat": "40.628100", "lng": "14.484900"})

    assert response.status_code == 200
    assert response.json() == {"name": "Positano", "country_code": "IT", "country_name": "Italy"}


@respx.mock
def test_geocode_failure_answers_503_with_a_message(author):
    respx.get("https://nominatim.openstreetmap.org/reverse").mock(
        side_effect=httpx.ReadTimeout("timed out")
    )

    response = author.get(GEOCODE, {"lat": "40.6281", "lng": "14.4849"})

    assert response.status_code == 503
    assert response.json() == {"detail": "The lookup service failed."}


def test_geocode_checks_the_coordinates(author):
    response = author.get(GEOCODE, {"lat": "100", "lng": "abc"})

    assert response.status_code == 400
    assert set(response.json()) == {"lat", "lng"}


def test_br14_geocode_is_for_the_author_only(visitor):
    response = visitor.get(GEOCODE, {"lat": "40.6281", "lng": "14.4849"})

    assert response.status_code == 403


def test_place_coordinates_keep_six_decimal_places(author, trip):
    author.post(LIST, place_data(trip, latitude="40.1", longitude="-3.25"), format="json")

    city = City.objects.get()
    assert (city.latitude, city.longitude) == (Decimal("40.100000"), Decimal("-3.250000"))
