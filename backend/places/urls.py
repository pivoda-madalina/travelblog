from django.urls import path
from rest_framework.routers import SimpleRouter

from places.views import PlaceViewSet, reverse_geocode_view

router = SimpleRouter()
router.register("places", PlaceViewSet, basename="place")

urlpatterns = [
    path("geocode/reverse/", reverse_geocode_view, name="geocode-reverse"),
    *router.urls,
]
