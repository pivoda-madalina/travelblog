import os

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from core.seed.load import seed_author, seed_trips


class Command(BaseCommand):
    help = (
        "Loads the sample trips for the demo and creates the author account from "
        "SEED_AUTHOR_USERNAME and SEED_AUTHOR_PASSWORD. Running it again replaces the sample trips."
    )

    def handle(self, *args, **options):
        username = os.environ.get("SEED_AUTHOR_USERNAME", "author")
        password = os.environ.get("SEED_AUTHOR_PASSWORD", "")
        if not password:
            raise CommandError("Set SEED_AUTHOR_PASSWORD, for example in .env, then run it again.")
        try:
            seed_author(username, password)
            trips = seed_trips()
        except ValidationError as error:
            raise CommandError(f"The sample data was not loaded: {error}") from error
        self.stdout.write(f"Author: {username}")
        for trip in trips:
            self.stdout.write(f"Trip: {trip.title} ({trip.get_status_display().lower()})")
        self.stdout.write(self.style.SUCCESS(f"Loaded {len(trips)} sample trips."))
