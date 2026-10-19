from django.db.models import Prefetch
from rest_framework import mixins, viewsets

from core.permissions import TripVisibilityMixin
from places.models import Place
from trips.models import Trip
from trips.serializers import TripSerializer


class TripViewSet(
    TripVisibilityMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Trips, newest first. Visitors see published trips only (BR-14). Deleting a trip deletes
    everything that belongs to it, files included (BR-11)."""

    # Places and their cities in one extra query, for the countries on each card (US-03).
    queryset = Trip.objects.prefetch_related(
        Prefetch("places", queryset=Place.objects.select_related("city").order_by("position"))
    )
    serializer_class = TripSerializer
    trip_field = None
