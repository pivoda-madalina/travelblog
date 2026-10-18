import datetime

import pytest
from django.contrib.auth.models import AnonymousUser
from django.db import IntegrityError

from budget.models import Expense
from budget.tests.factories import ExpenseFactory
from core.tests.factories import UserFactory
from journal.models import JournalEntry, Photo
from journal.tests.factories import JournalEntryFactory, PhotoFactory
from places.models import City, Place
from places.tests.factories import PlaceFactory
from trips.models import Trip
from trips.tests.factories import TripFactory

pytestmark = pytest.mark.django_db


def test_br11_trip_delete_cascades():
    trip = TripFactory()
    place = PlaceFactory(trip=trip)
    entry = JournalEntryFactory(trip=trip, place=place)
    PhotoFactory(trip=trip, journal_entry=entry)
    PhotoFactory(trip=trip)
    ExpenseFactory(trip=trip)
    other_trip = TripFactory()
    ExpenseFactory(trip=other_trip)

    trip.delete()

    assert not Place.objects.exists()
    assert not JournalEntry.objects.exists()
    assert not Photo.objects.exists()
    assert list(Expense.objects.values_list("trip", flat=True)) == [other_trip.pk]
    # Cities are shared between trips, so they stay.
    assert City.objects.filter(pk=place.city_id).exists()


def test_trip_end_date_cannot_be_before_start_date():
    with pytest.raises(IntegrityError):
        TripFactory(start_date=datetime.date(2025, 5, 10), end_date=datetime.date(2025, 5, 9))


def test_single_day_trip_is_allowed():
    day = datetime.date(2025, 5, 10)

    trip = TripFactory(start_date=day, end_date=day)

    assert trip.start_date == trip.end_date


def test_new_trip_is_a_draft_without_budget():
    trip = Trip.objects.create(
        title="Lisbon", start_date=datetime.date(2025, 5, 10), end_date=datetime.date(2025, 5, 14)
    )

    assert trip.status == Trip.Status.DRAFT
    assert trip.planned_budget is None
    assert str(trip) == "Lisbon"


def test_visible_to_hides_drafts_from_visitors_only():
    draft = TripFactory(status=Trip.Status.DRAFT)
    published = TripFactory(status=Trip.Status.PUBLISHED)

    assert list(Trip.objects.visible_to(AnonymousUser())) == [published]
    assert set(Trip.objects.visible_to(UserFactory())) == {draft, published}
