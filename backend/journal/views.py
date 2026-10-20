from rest_framework import mixins, viewsets

from core.permissions import TripVisibilityMixin
from journal.models import JournalEntry, Photo
from journal.serializers import JournalEntrySerializer, PhotoSerializer


class TripFilterMixin:
    """`?trip=12` narrows a list to one trip; a malformed id finds nothing."""

    def get_queryset(self):
        queryset = super().get_queryset()
        trip = self.request.query_params.get("trip")
        if trip is not None:
            queryset = queryset.filter(trip=trip) if trip.isdigit() else queryset.none()
        return queryset


class JournalEntryViewSet(TripVisibilityMixin, TripFilterMixin, viewsets.ModelViewSet):
    """A trip's journal by date: `/api/journal-entries/?trip=12`. Visitors only read entries of
    published trips (BR-14)."""

    queryset = JournalEntry.objects.select_related("place__city").order_by("date", "id")
    serializer_class = JournalEntrySerializer


class PhotoViewSet(
    TripVisibilityMixin,
    TripFilterMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """A trip's gallery in upload order: `/api/photos/?trip=12`. Visitors only see photos of
    published trips (BR-14). Deleting a photo removes its image and thumbnail files."""

    queryset = Photo.objects.order_by("created_at", "id")
    serializer_class = PhotoSerializer
