from django.db import transaction
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from core.permissions import IsAuthor, TripVisibilityMixin
from places.geocoding import GeocodingError, reverse_geocode
from places.models import Place
from places.serializers import CoordinatesSerializer, PlaceSerializer, RouteOrderSerializer


class PlaceViewSet(
    TripVisibilityMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """A trip's places in route order: `/api/places/?trip=12`. Visitors only see places of
    published trips (BR-14)."""

    queryset = Place.objects.select_related("city").order_by("trip", "position", "id")
    serializer_class = PlaceSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        trip = self.request.query_params.get("trip")
        if trip is not None:
            queryset = queryset.filter(trip=trip) if trip.isdigit() else queryset.none()
        return queryset

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """Sets the whole route order in one request (US-04)."""
        order = RouteOrderSerializer(data=request.data)
        order.is_valid(raise_exception=True)
        places = {place.pk: place for place in order.validated_data["trip"].places.all()}
        for position, pk in enumerate(order.validated_data["places"]):
            places[pk].position = position
        with transaction.atomic():
            Place.objects.bulk_update(places.values(), ["position"])
        ordered = self.get_queryset().filter(trip=order.validated_data["trip"])
        return Response(self.get_serializer(ordered, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthor])
def reverse_geocode_view(request):
    """The city and country at a clicked point, for the author only (US-04). A failed lookup
    answers 503 so the author can type them instead."""
    coordinates = CoordinatesSerializer(data=request.query_params)
    coordinates.is_valid(raise_exception=True)
    try:
        location = reverse_geocode(
            coordinates.validated_data["lat"], coordinates.validated_data["lng"]
        )
    except GeocodingError as error:
        return Response({"detail": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response(
        {
            "name": location.name,
            "country_code": location.country_code,
            "country_name": location.country_name,
        }
    )
