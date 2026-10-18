"""Sample endpoints built from the BR-14 building blocks, the way feature issues will build theirs.

The real trip, place and expense endpoints arrive with #8 and later; until then these prove that
the shared permissions, visibility mixin and author-only fields behave as the rules require.
"""

from django.urls import include, path
from rest_framework import routers, serializers, viewsets

from budget.models import Expense
from config.urls import urlpatterns as real_urlpatterns
from core.permissions import IsAuthor, TripVisibilityMixin
from core.serializers import AuthorOnlyFieldsMixin
from places.models import Place
from trips.models import Trip


class TripSerializer(AuthorOnlyFieldsMixin, serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = ["id", "title", "status", "planned_budget"]
        author_only_fields = ["planned_budget"]


class PlaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Place
        fields = ["id", "trip", "city", "visited_on"]


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = ["id", "trip", "description", "amount_ron"]


class TripViewSet(TripVisibilityMixin, viewsets.ModelViewSet):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    trip_field = None


class PlaceViewSet(TripVisibilityMixin, viewsets.ModelViewSet):
    queryset = Place.objects.all()
    serializer_class = PlaceSerializer


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthor]


router = routers.SimpleRouter()
router.register("sample-trips", TripViewSet, basename="sample-trip")
router.register("sample-places", PlaceViewSet, basename="sample-place")
router.register("sample-expenses", ExpenseViewSet, basename="sample-expense")

urlpatterns = [*real_urlpatterns, path("api/", include(router.urls))]
