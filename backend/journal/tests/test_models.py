import pytest

from journal.models import JournalEntry, Photo
from journal.tests.factories import JournalEntryFactory, PhotoFactory
from places.tests.factories import PlaceFactory

pytestmark = pytest.mark.django_db


def test_br11_entry_delete_removes_photos():
    entry = JournalEntryFactory()
    PhotoFactory(trip=entry.trip, journal_entry=entry)
    gallery_photo = PhotoFactory(trip=entry.trip)

    entry.delete()

    assert list(Photo.objects.all()) == [gallery_photo]


def test_place_delete_keeps_its_journal_entries():
    place = PlaceFactory()
    entry = JournalEntryFactory(trip=place.trip, place=place)

    place.delete()
    entry.refresh_from_db()

    assert entry.place is None


def test_journal_entry_and_photo_names():
    entry = JournalEntryFactory(title="Arrival")
    photo = PhotoFactory(caption="")

    assert str(entry) == "Arrival"
    assert str(photo) == photo.image.name


def test_entry_without_a_trip_is_left_to_field_validation():
    JournalEntry(title="Arrival").clean()
