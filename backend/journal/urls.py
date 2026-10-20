from rest_framework.routers import SimpleRouter

from journal.views import JournalEntryViewSet

router = SimpleRouter()
router.register("journal-entries", JournalEntryViewSet, basename="journal-entry")

urlpatterns = router.urls
