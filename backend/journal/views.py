from rest_framework import viewsets

from core.permissions import TripVisibilityMixin
from journal.models import JournalEntry
from journal.serializers import JournalEntrySerializer


class JournalEntryViewSet(TripVisibilityMixin, viewsets.ModelViewSet):
    """A trip's journal by date: `/api/journal-entries/?trip=12`. Visitors only read entries of
    published trips (BR-14)."""

    queryset = JournalEntry.objects.select_related("place__city").order_by("date", "id")
    serializer_class = JournalEntrySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        trip = self.request.query_params.get("trip")
        if trip is not None:
            queryset = queryset.filter(trip=trip) if trip.isdigit() else queryset.none()
        return queryset
