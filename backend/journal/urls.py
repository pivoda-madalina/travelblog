from rest_framework.routers import SimpleRouter

from journal.views import JournalEntryViewSet, PhotoViewSet

router = SimpleRouter()
router.register("journal-entries", JournalEntryViewSet, basename="journal-entry")
router.register("photos", PhotoViewSet, basename="photo")

urlpatterns = router.urls
