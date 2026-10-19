from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

urlpatterns = [
    path("api/", include("core.urls")),
    path("api/", include("trips.urls")),
    path("api/", include("places.urls")),
]

# In development Django serves uploaded photos; the Vite proxy forwards /media to it.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
