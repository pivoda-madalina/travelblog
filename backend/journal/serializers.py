from rest_framework import serializers

from core.serializers import ModelCleanMixin
from journal.models import JournalEntry


class JournalEntrySerializer(ModelCleanMixin, serializers.ModelSerializer):
    """An entry with its text in Markdown (US-07). `place_name` is the linked place's city, for
    the pin beside the title."""

    place_name = serializers.CharField(source="place.city.name", read_only=True, default=None)

    class Meta:
        model = JournalEntry
        fields = ["id", "trip", "date", "place", "place_name", "title", "body"]
