from rest_framework import serializers

from core.serializers import AuthorOnlyFieldsMixin, ModelCleanMixin
from trips.models import Trip


class TripSerializer(AuthorOnlyFieldsMixin, ModelCleanMixin, serializers.ModelSerializer):
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
        ]
        read_only_fields = ["created_at"]
        author_only_fields = ["planned_budget"]
