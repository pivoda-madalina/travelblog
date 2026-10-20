"""US-07: the author writes journal entries in Markdown, optionally linked to a place. BR-09:
entries are dated within their trip. BR-14: visitors only read entries of published trips."""

import datetime

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.tests.factories import UserFactory
from journal.models import JournalEntry
from journal.tests.factories import JournalEntryFactory
from places.tests.factories import PlaceFactory
from trips.models import Trip
from trips.tests.factories import TripFactory

pytestmark = pytest.mark.django_db

LIST = reverse("journal-entry-list")


def day(n: int) -> datetime.date:
    return datetime.date(2026, 5, n)


def detail(entry: JournalEntry) -> str:
    return reverse("journal-entry-detail", args=[entry.pk])


@pytest.fixture
def visitor():
    return APIClient()


@pytest.fixture
def author():
    client = APIClient()
    client.force_login(UserFactory())
    return client


@pytest.fixture
def trip():
    return TripFactory(start_date=day(12), end_date=day(20))


def entry_data(trip, **overrides):
    return {
        "trip": trip.pk,
        "date": "2026-05-12",
        "title": "Arrival in Rome",
        "body": "## Arrival in Rome\n\nWe landed at **noon**.\n\n- Trastevere\n- Gelato",
        **overrides,
    }


def test_author_writes_an_entry_linked_to_a_place(author, trip):
    place = PlaceFactory(trip=trip, city__name="Rome")

    response = author.post(LIST, entry_data(trip, place=place.pk), format="json")

    assert response.status_code == 201
    entry = JournalEntry.objects.get()
    assert response.json() == {
        "id": entry.pk,
        "trip": trip.pk,
        "date": "2026-05-12",
        "place": place.pk,
        "place_name": "Rome",
        "title": "Arrival in Rome",
        "body": "## Arrival in Rome\n\nWe landed at **noon**.\n\n- Trastevere\n- Gelato",
    }


def test_an_entry_without_a_place(author, trip):
    response = author.post(LIST, entry_data(trip), format="json")

    assert response.status_code == 201
    assert response.json()["place"] is None
    assert response.json()["place_name"] is None


def test_a_day_can_have_several_entries(author, trip):
    author.post(LIST, entry_data(trip, title="Morning"), format="json")
    response = author.post(LIST, entry_data(trip, title="Evening"), format="json")

    assert response.status_code == 201
    assert JournalEntry.objects.filter(trip=trip, date=day(12)).count() == 2


@pytest.mark.parametrize("date", ["2026-05-11", "2026-05-21"])
def test_br09_entry_date_within_trip(author, trip, date):
    response = author.post(LIST, entry_data(trip, date=date), format="json")

    assert response.status_code == 400
    assert response.json() == {
        "date": ["The date must be within the trip, 12 May 2026 to 20 May 2026."]
    }


@pytest.mark.parametrize("date", ["2026-05-12", "2026-05-20"])
def test_br09_entry_on_the_first_and_last_day(author, trip, date):
    assert author.post(LIST, entry_data(trip, date=date), format="json").status_code == 201


def test_br09_entry_date_checked_on_edit(author, trip):
    entry = JournalEntryFactory(trip=trip)

    response = author.patch(detail(entry), {"date": "2026-05-21"}, format="json")

    assert response.status_code == 400
    entry.refresh_from_db()
    assert entry.date == day(12)


def test_linked_place_must_belong_to_the_same_trip(author, trip):
    other_place = PlaceFactory()

    response = author.post(LIST, entry_data(trip, place=other_place.pk), format="json")

    assert response.status_code == 400
    assert response.json() == {"place": ["Choose a place on this trip's route."]}


def test_entry_needs_a_title(author, trip):
    response = author.post(LIST, entry_data(trip, title=""), format="json")

    assert response.status_code == 400
    assert "title" in response.json()


def test_author_edits_and_deletes_an_entry(author, trip):
    entry = JournalEntryFactory(trip=trip)

    response = author.patch(detail(entry), {"title": "Renamed", "body": "**Bold**"}, format="json")
    assert response.status_code == 200
    entry.refresh_from_db()
    assert (entry.title, entry.body) == ("Renamed", "**Bold**")

    assert author.delete(detail(entry)).status_code == 204
    assert not JournalEntry.objects.exists()


def test_entries_of_a_trip_by_date(author, trip):
    later = JournalEntryFactory(trip=trip, date=day(14))
    first = JournalEntryFactory(trip=trip, date=day(12))
    same_day = JournalEntryFactory(trip=trip, date=day(12))
    JournalEntryFactory()  # another trip's entry

    response = author.get(f"{LIST}?trip={trip.pk}")

    assert [entry["id"] for entry in response.json()] == [first.pk, same_day.pk, later.pk]


def test_malformed_trip_filter_finds_nothing(author, trip):
    JournalEntryFactory(trip=trip)

    assert author.get(f"{LIST}?trip=abc").json() == []


def test_br14_visitor_reads_entries_of_published_trips_only(visitor):
    published = JournalEntryFactory(trip__status=Trip.Status.PUBLISHED)
    draft = JournalEntryFactory(trip__status=Trip.Status.DRAFT)

    response = visitor.get(LIST)

    assert [entry["id"] for entry in response.json()] == [published.pk]
    assert visitor.get(detail(published)).status_code == 200
    assert visitor.get(detail(draft)).status_code == 404


def test_br14_visitor_cannot_write_entries(visitor, trip):
    entry = JournalEntryFactory(trip=trip)

    assert visitor.post(LIST, entry_data(trip), format="json").status_code == 403
    assert visitor.patch(detail(entry), {"title": "Hacked"}, format="json").status_code == 403
    assert visitor.delete(detail(entry)).status_code == 403
    entry.refresh_from_db()
    assert entry.title != "Hacked"
