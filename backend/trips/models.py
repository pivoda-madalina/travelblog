import datetime

from django.core.exceptions import ValidationError
from django.db import models

from core.validators import validate_jpeg


def format_date(date: datetime.date) -> str:
    """12 May 2026, the date format used across the site (docs/ui-design.md)."""
    return f"{date.day} {date:%b %Y}"


class TripQuerySet(models.QuerySet):
    def visible_to(self, user) -> "TripQuerySet":
        """The author sees every trip; visitors only see published ones (BR-14)."""
        if user.is_authenticated:
            return self
        return self.filter(status=Trip.Status.PUBLISHED)

    def overlapping(self, start_date: datetime.date, end_date: datetime.date) -> "TripQuerySet":
        """Trips sharing at least one day with these dates. Dates are inclusive, so a trip ending
        on the day another starts counts as overlapping (#28)."""
        return self.filter(start_date__lte=end_date, end_date__gte=start_date)


class Trip(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    title = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField()
    summary = models.TextField(blank=True)
    cover_photo = models.ImageField(upload_to="covers/", blank=True, validators=[validate_jpeg])
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    planned_budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = TripQuerySet.as_manager()

    class Meta:
        # Newest first by creation date (US-01).
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F("start_date")),
                name="trip_end_date_not_before_start_date",
            ),
        ]

    def __str__(self) -> str:
        return self.title

    def clean(self):
        if self.start_date is None or self.end_date is None:
            return
        if self.end_date < self.start_date:
            raise ValidationError({"end_date": "The end date cannot be before the start date."})
        # BR-10: no overlap with any other trip, drafts included. On edit, the trip itself is
        # left out.
        other = (
            Trip.objects.overlapping(self.start_date, self.end_date)
            .exclude(pk=self.pk)
            .order_by("start_date")
            .first()
        )
        if other is not None:
            raise ValidationError(
                {
                    "start_date": f'This trip overlaps "{other.title}" '
                    f"({format_date(other.start_date)} to {format_date(other.end_date)})."
                }
            )
        if self.pk is not None:
            self._check_content_within_dates()

    def _check_content_within_dates(self):
        """BR-09: on edit, the new dates must still hold the trip's places and journal entries."""
        dates = [
            *self.places.values_list("visited_on", flat=True),
            *self.entries.values_list("date", flat=True),
        ]
        errors = {}
        if dates and min(dates) < self.start_date:
            errors["start_date"] = (
                f"A place or journal entry is dated {format_date(min(dates))}, before this "
                "start date. Change its date first."
            )
        if dates and max(dates) > self.end_date:
            errors["end_date"] = (
                f"A place or journal entry is dated {format_date(max(dates))}, after this "
                "end date. Change its date first."
            )
        if errors:
            raise ValidationError(errors)
