"""#22: `manage.py seed` loads invented trips for the demo, repeatably and offline."""

import datetime
import io

import pytest
from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient

from budget.models import Expense, RateSource
from budget.summary import budget_summary
from core.seed import data, images
from journal.models import JournalEntry, Photo
from places.models import City, Place
from trips.models import Trip
from trips.tests.factories import TripFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def seed(monkeypatch, settings):
    monkeypatch.setenv("SEED_AUTHOR_USERNAME", "madalina")
    monkeypatch.setenv("SEED_AUTHOR_PASSWORD", "demo-pass-123")

    def run():
        out = io.StringIO()
        call_command("seed", stdout=out)
        return out.getvalue()

    return run


def snapshot():
    """Everything the seed writes, without ids, file names or timestamps."""
    return {
        "trips": sorted(
            Trip.objects.values_list("title", "start_date", "end_date", "status", "planned_budget")
        ),
        "places": sorted(Place.objects.values_list("trip__title", "city__name", "position")),
        "entries": sorted(JournalEntry.objects.values_list("trip__title", "date", "title")),
        "photos": sorted(
            Photo.objects.values_list("trip__title", "caption", "journal_entry__title")
        ),
        "expenses": sorted(
            Expense.objects.values_list("trip__title", "description", "amount_ron", "rate_source")
        ),
        "cities": City.objects.count(),
    }


def test_seed_loads_the_sample_trips(seed):
    output = seed()

    assert Trip.objects.count() == len(data.TRIPS) == 4
    assert "Loaded 4 sample trips." in output
    assert Place.objects.count() == 8
    assert JournalEntry.objects.count() == 8
    assert Photo.objects.count() == 10
    assert all(photo.thumbnail for photo in Photo.objects.all())
    assert all(trip.cover_photo for trip in Trip.objects.all())
    # Markdown in the journal (US-07).
    assert JournalEntry.objects.filter(body__contains="**").count() >= 5


def test_seed_photos_are_jpegs(seed):
    seed()

    for photo in Photo.objects.all():
        with Image.open(photo.image) as image:
            assert image.format == "JPEG"


def test_seed_expenses_use_fixed_rates(seed):
    seed()

    assert set(Expense.objects.values_list("currency", flat=True)) == {"EUR", "HUF", "RON"}
    tickets = Expense.objects.get(description="Vatican Museums tickets")
    assert (tickets.rate_source, str(tickets.amount_ron)) == (RateSource.MANUAL, "306.12")
    hotel = Expense.objects.get(description="Hotel by the river")
    assert (hotel.rate, str(hotel.amount_ron)) == (data.HUF, "1243.20")


def test_seed_has_trips_over_and_under_budget(seed):
    seed()

    rome = budget_summary(Trip.objects.get(title="Rome and the Amalfi Coast"))
    budapest = budget_summary(Trip.objects.get(title="A long weekend in Budapest"))
    assert rome.over_budget is True
    assert budapest.over_budget is False


def test_seed_future_trip_and_draft_stay_off_the_world_map(seed):
    seed()

    body = APIClient().get(reverse("world-map")).json()
    cities = {city["name"] for city in body["cities"]}
    assert cities == {"Rome", "Naples", "Positano", "Budapest"}
    assert body["countries"] == ["HU", "IT"]
    assert (
        min(
            Place.objects.filter(trip__title="Lisbon and Porto").values_list(
                "visited_on", flat=True
            )
        )
        > datetime.date.today()
    )


def test_seed_draft_hidden_from_visitors(seed):
    seed()

    titles = {trip["title"] for trip in APIClient().get(reverse("trip-list")).json()}
    assert "Vienna at Christmas" not in titles
    assert len(titles) == 3


def test_seed_trips_list_starts_with_rome(seed, django_capture_on_commit_callbacks):
    for _ in range(2):
        with django_capture_on_commit_callbacks(execute=True):
            seed()
        author = APIClient()
        author.force_login(get_user_model().objects.get())

        author_titles = [trip["title"] for trip in author.get(reverse("trip-list")).json()]
        visitor_titles = [trip["title"] for trip in APIClient().get(reverse("trip-list")).json()]

        assert author_titles == [trip.title for trip in data.TRIPS]
        assert visitor_titles == [
            trip.title for trip in data.TRIPS if trip.status == Trip.Status.PUBLISHED
        ]


def test_seed_is_repeatable(seed, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        seed()
    first = snapshot()
    files = Photo.objects.count()

    with django_capture_on_commit_callbacks(execute=True):
        seed()

    assert snapshot() == first
    assert Photo.objects.count() == files


def test_seed_leaves_other_trips_alone(seed):
    own = TripFactory(
        title="My own trip",
        start_date=datetime.date(2024, 6, 1),
        end_date=datetime.date(2024, 6, 5),
    )

    seed()
    seed()

    assert Trip.objects.filter(pk=own.pk).exists()


def test_seed_stops_on_a_trip_overlapping_a_sample_trip(seed):
    TripFactory(
        title="Overlap", start_date=datetime.date(2026, 5, 14), end_date=datetime.date(2026, 5, 15)
    )

    with pytest.raises(CommandError, match="overlaps"):
        seed()

    # Nothing half loaded.
    assert list(Trip.objects.values_list("title", flat=True)) == ["Overlap"]


def test_seed_creates_the_author_from_the_environment(seed):
    seed()
    seed()

    user = get_user_model().objects.get()
    assert user.username == "madalina"
    assert APIClient().login(username="madalina", password="demo-pass-123")


def test_seed_needs_the_author_password(seed, monkeypatch):
    monkeypatch.delenv("SEED_AUTHOR_PASSWORD")

    with pytest.raises(CommandError, match="SEED_AUTHOR_PASSWORD"):
        seed()
    assert not Trip.objects.exists()


def test_seed_uses_a_real_photo_when_there_is_one(seed, monkeypatch, tmp_path):
    real = Image.new("RGB", (64, 48), "red")
    real.save(tmp_path / "colosseum.jpg", format="JPEG")
    monkeypatch.setattr(images, "PHOTOS", tmp_path)

    seed()

    with Image.open(Photo.objects.get(caption="The Colosseum at dusk").image) as image:
        assert image.size == (64, 48)


def test_placeholders_differ_by_name_and_repeat_by_name():
    assert images.placeholder("a.jpg", "sea") == images.placeholder("a.jpg", "sea")
    assert images.placeholder("a.jpg", "sea") != images.placeholder("b.jpg", "sea")
