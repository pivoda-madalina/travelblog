"""Visitor restrictions (BR-14). The default permission in settings makes every endpoint
read-only for visitors; these pieces handle drafts and the budget."""

from rest_framework.permissions import IsAuthenticated

from trips.models import Trip


class IsAuthor(IsAuthenticated):
    """For budget and expense endpoints: visitors are refused, reads included."""


class TripVisibilityMixin:
    """For viewsets of trips or of a trip's content (places, entries, photos).

    Visitors never see draft trips or anything under them: drafts drop out of lists and their
    detail URLs return 404, so their existence is not revealed (architecture, Permissions).
    Set `trip_field` to the path from the model to its trip, or to None on the trip viewset.
    """

    trip_field: str | None = "trip"

    def get_queryset(self):
        queryset = super().get_queryset()
        trips = Trip.objects.visible_to(self.request.user)
        if self.trip_field is None:
            return queryset.filter(pk__in=trips)
        return queryset.filter(**{f"{self.trip_field}__in": trips})
