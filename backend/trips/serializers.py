from rest_framework import serializers

from core.serializers import AuthorOnlyFieldsMixin, ModelCleanMixin
from trips.models import Trip


class TripSerializer(AuthorOnlyFieldsMixin, ModelCleanMixin, serializers.ModelSerializer):
    countries = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = [
            "id",
            "title",
            "start_date",
            "end_date",
            "summary",
            "cover_photo",
            "status",
            "planned_budget",
            "created_at",
            "countries",
        ]
        read_only_fields = ["created_at"]
        author_only_fields = ["planned_budget"]

    def get_countries(self, trip: Trip) -> list[str]:
        """The countries of the trip's places, in route order, each once (US-03). Reads the
        places prefetched by the viewset, so a list costs no query per trip."""
        names = (place.city.country_name for place in trip.places.all())
        return list(dict.fromkeys(names))
