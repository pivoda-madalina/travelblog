from django.db import models


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


class Photo(models.Model):
    trip = models.ForeignKey("trips.Trip", on_delete=models.CASCADE, related_name="photos")
    # CASCADE: deleting a journal entry deletes its photos (BR-11).
    journal_entry = models.ForeignKey(
        JournalEntry, on_delete=models.CASCADE, null=True, blank=True, related_name="photos"
    )
    image = models.ImageField(upload_to="photos/")
    thumbnail = models.ImageField(upload_to="photos/thumbnails/", blank=True)
    caption = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self) -> str:
        return self.caption or self.image.name
