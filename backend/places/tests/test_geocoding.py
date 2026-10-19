"""The Nominatim client. HTTP is mocked with respx; tests never call the network."""

from decimal import Decimal

import httpx
import pytest
import respx

from places.geocoding import GeocodingError, Location, reverse_geocode

REVERSE = "https://nominatim.openstreetmap.org/reverse"

LAT, LNG = Decimal("40.628100"), Decimal("14.484900")


def answer(**address):
    return httpx.Response(200, json={"place_id": 1, "address": address})


@respx.mock
def test_returns_the_city_and_country_at_the_point():
    route = respx.get(REVERSE).mock(
        return_value=answer(city="Rome", country="Italy", country_code="it")
    )

    assert reverse_geocode(LAT, LNG) == Location("Rome", "IT", "Italy")
    request = route.calls.last.request
    assert request.url.params["lat"] == "40.628100"
    assert request.url.params["lon"] == "14.484900"
    assert request.url.params["zoom"] == "10"
    assert request.headers["User-Agent"] == "travelblog/0.1 (portfolio project)"


@respx.mock
def test_a_town_or_village_counts_as_the_city():
    respx.get(REVERSE).mock(
        return_value=answer(
            village="Positano", county="Salerno", country="Italy", country_code="it"
        )
    )

    assert reverse_geocode(LAT, LNG).name == "Positano"


@respx.mock
def test_a_point_without_a_city_fails():
    # Nominatim answers like this for a point in the sea.
    respx.get(REVERSE).mock(return_value=httpx.Response(200, json={"error": "Unable to geocode"}))

    with pytest.raises(GeocodingError, match="No city"):
        reverse_geocode(LAT, LNG)


@pytest.mark.parametrize(
    "failure",
    [
        httpx.Response(500),
        httpx.Response(200, text="not json"),
        httpx.ReadTimeout("timed out"),
        httpx.ConnectError("no network"),
    ],
)
@respx.mock
def test_a_failing_service_raises_a_geocoding_error(failure):
    route = respx.get(REVERSE)
    if isinstance(failure, Exception):
        route.mock(side_effect=failure)
    else:
        route.mock(return_value=failure)

    with pytest.raises(GeocodingError, match="lookup service failed"):
        reverse_geocode(LAT, LNG)
