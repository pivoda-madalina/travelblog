from django.db import models


class City(models.Model):
    """A real location, shared by every trip that visits it (ADR 0004, BR-12)."""

    name = models.CharField(max_length=200)
    country_code = models.CharField(max_length=2)
    country_name = models.CharField(max_length=200)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)

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


class Place(models.Model):
    """One stop on a trip's route."""

    trip = models.ForeignKey("trips.Trip", on_delete=models.CASCADE, related_name="places")
    # PROTECT: a city outlives the trips that visit it (BR-11).
    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name="places")
    visited_on = models.DateField()
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["trip", "position"]

    def __str__(self) -> str:
        return f"{self.city.name} on {self.visited_on}"
