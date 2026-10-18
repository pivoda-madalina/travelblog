from rest_framework.routers import SimpleRouter

from trips.views import TripViewSet

router = SimpleRouter()
router.register("trips", TripViewSet, basename="trip")

urlpatterns = router.urls
