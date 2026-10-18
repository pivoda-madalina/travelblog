from rest_framework import mixins, viewsets

from core.permissions import TripVisibilityMixin
from trips.models import Trip
from trips.serializers import TripSerializer


class TripViewSet(
    TripVisibilityMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """Trips, newest first. Visitors see published trips only (BR-14). Editing and deleting
    arrive with #9."""

    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    trip_field = None
