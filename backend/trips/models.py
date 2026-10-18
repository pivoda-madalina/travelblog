from django.db import models


class Trip(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    title = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField()
    summary = models.TextField(blank=True)
    cover_photo = models.ImageField(upload_to="covers/", blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    planned_budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F("start_date")),
                name="trip_end_date_not_before_start_date",
            ),
        ]

    def __str__(self) -> str:
        return self.title
