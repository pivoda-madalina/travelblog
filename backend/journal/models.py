from django.core.exceptions import ValidationError
from django.db import models

from core.validators import MAX_PHOTOS_PER_TRIP, validate_jpeg
from journal.thumbnails import make_thumbnail
from trips.models import format_date


class JournalEntry(models.Model):
    trip = models.ForeignKey("trips.Trip", on_delete=models.CASCADE, related_name="entries")
    place = models.ForeignKey(
        "places.Place", on_delete=models.SET_NULL, null=True, blank=True, related_name="entries"
    )
    date = models.DateField()
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True, help_text="Markdown")

    class Meta:
        verbose_name_plural = "journal entries"
        ordering = ["date", "id"]

    def __str__(self) -> str:
        return self.title

    def clean(self):
        if self.trip_id is None:
            return
        trip = self.trip
        errors = {}
        # BR-09: an entry is dated within its trip. A day can have several entries (US-07).
        if self.date is not None and not trip.start_date <= self.date <= trip.end_date:
            errors["date"] = (
                "The date must be within the trip, "
                f"{format_date(trip.start_date)} to {format_date(trip.end_date)}."
            )
        if self.place is not None and self.place.trip_id != self.trip_id:
            errors["place"] = "Choose a place on this trip's route."
        if errors:
            raise ValidationError(errors)


class Photo(models.Model):
    """A photo in its trip's gallery, optionally attached to one of the trip's journal entries
    (US-08). The thumbnail is made from the image on the first save."""

    trip = models.ForeignKey("trips.Trip", on_delete=models.CASCADE, related_name="photos")
    # CASCADE: deleting a journal entry deletes its photos (BR-11).
    journal_entry = models.ForeignKey(
        JournalEntry, on_delete=models.CASCADE, null=True, blank=True, related_name="photos"
    )
    image = models.ImageField(upload_to="photos/", validators=[validate_jpeg])
    thumbnail = models.ImageField(upload_to="photos/thumbnails/", blank=True)
    caption = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self) -> str:
        return self.caption or self.image.name

    def save(self, *args, **kwargs):
        if self.image and not self.thumbnail:
            thumbnail = make_thumbnail(self.image)
            self.thumbnail.save(thumbnail.name, thumbnail, save=False)
        super().save(*args, **kwargs)

    def clean(self):
        if self.trip_id is None:
            return
        errors = {}
        if self.journal_entry is not None and self.journal_entry.trip_id != self.trip_id:
            errors["journal_entry"] = "Choose an entry of this trip's journal."
        # At most 10 photos per trip (#26).
        if self.pk is None and self.trip.photos.count() >= MAX_PHOTOS_PER_TRIP:
            errors["image"] = f"A trip can have at most {MAX_PHOTOS_PER_TRIP} photos."
        if errors:
            raise ValidationError(errors)
