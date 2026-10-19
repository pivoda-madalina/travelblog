from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from trips.models import Trip, format_date


class CityQuerySet(models.QuerySet):
    def find_or_create(self, *, name, country_code, country_name, latitude, longitude) -> "City":
        """The city with this name in this country, created the first time it is added (ADR 0004,
        BR-12). The name matches regardless of case; an existing city keeps its coordinates."""
        city = self.filter(name__iexact=name, country_code=country_code).first()
        if city is not None:
            return city
        return self.create(
            name=name,
            country_code=country_code,
            country_name=country_name,
            latitude=latitude,
            longitude=longitude,
        )


class City(models.Model):
    """A real location, shared by every trip that visits it (ADR 0004, BR-12)."""

    name = models.CharField(max_length=200)
    country_code = models.CharField(max_length=2)
    country_name = models.CharField(max_length=200)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)

    objects = CityQuerySet.as_manager()

    class Meta:
        verbose_name_plural = "cities"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "country_code"], name="unique_city_per_country"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name}, {self.country_name}"


class PlaceQuerySet(models.QuerySet):
    def on_world_map(self) -> "PlaceQuerySet":
        """Places of published trips visited today or earlier: drafts and planned visits stay
        off the public map (BR-13)."""
        return self.filter(trip__status=Trip.Status.PUBLISHED, visited_on__lte=timezone.localdate())


class Place(models.Model):
    """One stop on a trip's route."""

    trip = models.ForeignKey("trips.Trip", on_delete=models.CASCADE, related_name="places")
    # PROTECT: a city outlives the trips that visit it (BR-11).
    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name="places")
    visited_on = models.DateField()
    position = models.PositiveIntegerField(default=0)

    objects = PlaceQuerySet.as_manager()

    class Meta:
        ordering = ["trip", "position"]

    def __str__(self) -> str:
        return f"{self.city.name} on {self.visited_on}"

    def clean(self):
        # BR-09: a place is dated within its trip.
        if self.trip_id is None or self.visited_on is None:
            return
        trip = self.trip
        if not trip.start_date <= self.visited_on <= trip.end_date:
            raise ValidationError(
                {
                    "visited_on": "The visit date must be within the trip, "
                    f"{format_date(trip.start_date)} to {format_date(trip.end_date)}."
                }
            )
