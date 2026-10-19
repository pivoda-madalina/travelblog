from django.apps import AppConfig


class JournalConfig(AppConfig):
    name = "journal"

    def ready(self):
        from journal import signals  # noqa: F401
