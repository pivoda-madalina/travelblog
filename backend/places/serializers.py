from django.db.models import Max
from rest_framework import serializers

from core.serializers import ModelCleanMixin
from places.models import City, Place
from trips.models import Trip

LATITUDE = {"max_digits": 9, "decimal_places": 6, "min_value": -90, "max_value": 90}
LONGITUDE = {"max_digits": 9, "decimal_places": 6, "min_value": -180, "max_value": 180}


class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = ["id", "name", "country_code", "country_name", "latitude", "longitude"]


class CoordinatesSerializer(serializers.Serializer):
    """The query of `GET /api/geocode/reverse/?lat=&lng=`."""

    lat = serializers.DecimalField(**LATITUDE)
    lng = serializers.DecimalField(**LONGITUDE)


class PlaceSerializer(ModelCleanMixin, serializers.ModelSerializer):
    """A place is sent as a city name, country and the clicked coordinates; the city is found or
    created from them (ADR 0004, BR-12) and returned nested."""

    city = CitySerializer(read_only=True)
    name = serializers.CharField(write_only=True, max_length=200)
    country_code = serializers.RegexField(r"^[A-Z]{2}$", write_only=True)
    country_name = serializers.CharField(write_only=True, max_length=200)
    latitude = serializers.DecimalField(write_only=True, **LATITUDE)
    longitude = serializers.DecimalField(write_only=True, **LONGITUDE)

    class Meta:
        model = Place
        fields = [
            "id",
            "trip",
            "city",
            "visited_on",
            "position",
            "name",
            "country_code",
            "country_name",
            "latitude",
            "longitude",
        ]
        read_only_fields = ["position"]

    def create(self, validated_data):
        city_fields = ("name", "country_code", "country_name", "latitude", "longitude")
        city = City.objects.find_or_create(
            **{field: validated_data.pop(field) for field in city_fields}
        )
        trip = validated_data["trip"]
        # A new place goes to the end of the route.
        last = trip.places.aggregate(last=Max("position"))["last"]
        position = 0 if last is None else last + 1
        return Place.objects.create(city=city, position=position, **validated_data)


class RouteOrderSerializer(serializers.Serializer):
    """`POST /api/places/reorder/`: every place of the trip, in the new route order (US-04)."""

    trip = serializers.PrimaryKeyRelatedField(queryset=Trip.objects.all())
    places = serializers.ListField(child=serializers.IntegerField())

    def validate(self, attrs):
        ids = attrs["places"]
        trip_ids = set(attrs["trip"].places.values_list("id", flat=True))
        if len(ids) != len(set(ids)) or set(ids) != trip_ids:
            raise serializers.ValidationError({"places": ["List every place of the trip once."]})
        return attrs
