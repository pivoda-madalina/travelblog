"""Reverse geocoding with OpenStreetMap Nominatim, called from the backend only (US-04).

Any failure raises GeocodingError, so the view can answer with a clear error and the author can
type the city and country instead.
"""

from dataclasses import dataclass
from decimal import Decimal

import httpx
from django.conf import settings

# Nominatim's address keys for a city-level name, from most to least specific.
CITY_KEYS = ("city", "town", "village", "municipality", "hamlet", "county", "state")


class GeocodingError(Exception):
    """The lookup failed, timed out, or found no city at the location."""


@dataclass(frozen=True)
class Location:
    name: str
    country_code: str
    country_name: str


def reverse_geocode(latitude: Decimal, longitude: Decimal) -> Location:
    try:
        response = httpx.get(
            f"{settings.NOMINATIM_URL}/reverse",
            params={
                "lat": str(latitude),
                "lon": str(longitude),
                "format": "jsonv2",
                "zoom": 10,  # city level (BR-12)
                "addressdetails": 1,
                "accept-language": "en",
            },
            headers={"User-Agent": settings.NOMINATIM_USER_AGENT},
            timeout=settings.NOMINATIM_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        address = response.json().get("address", {})
    except (httpx.HTTPError, ValueError, AttributeError) as error:
        raise GeocodingError("The lookup service failed.") from error

    name = next((address[key] for key in CITY_KEYS if address.get(key)), None)
    country_code = address.get("country_code", "")
    country_name = address.get("country")
    if not name or len(country_code) != 2 or not country_name:
        raise GeocodingError("No city was found at this location.")
    return Location(name=name, country_code=country_code.upper(), country_name=country_name)
