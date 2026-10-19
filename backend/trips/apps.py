from django.apps import AppConfig


class TripsConfig(AppConfig):
    name = "trips"

    def ready(self):
        from trips import signals  # noqa: F401
