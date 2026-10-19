"""BR-10: trips cannot overlap; a single-day trip is allowed. Dates are inclusive (#28).
BR-09, on edit: the trip's dates must still hold its places and journal entries."""

import datetime

import pytest
from django.core.exceptions import ValidationError

from journal.tests.factories import JournalEntryFactory
from places.tests.factories import PlaceFactory
from trips.models import Trip
from trips.tests.factories import TripFactory

pytestmark = pytest.mark.django_db


def day(n: int) -> datetime.date:
    return datetime.date(2026, 5, n)


def new_trip(start: datetime.date, end: datetime.date) -> Trip:
    return Trip(title="New", start_date=start, end_date=end)


@pytest.mark.parametrize(
    ("start", "end"),
    [
        (day(12), day(20)),  # same dates
        (day(10), day(14)),  # starts before, ends inside
        (day(18), day(25)),  # starts inside, ends after
        (day(14), day(16)),  # inside
        (day(1), day(31)),  # around
    ],
)
def test_br10_trips_cannot_overlap(start, end):
    TripFactory(title="Rome", start_date=day(12), end_date=day(20))

    with pytest.raises(ValidationError) as error:
        new_trip(start, end).clean()

    assert error.value.message_dict == {
        "start_date": ['This trip overlaps "Rome" (12 May 2026 to 20 May 2026).']
    }


def test_br10_trip_starting_the_day_another_ends_overlaps():
    TripFactory(start_date=day(5), end_date=day(10))

    with pytest.raises(ValidationError):
        new_trip(day(10), day(12)).clean()


def test_br10_trip_starting_the_day_after_another_ends_is_allowed():
    TripFactory(start_date=day(5), end_date=day(10))

    new_trip(day(11), day(12)).clean()


def test_br10_drafts_count_for_overlap():
    TripFactory(start_date=day(5), end_date=day(10), status=Trip.Status.DRAFT)

    with pytest.raises(ValidationError):
        new_trip(day(8), day(9)).clean()


def test_br10_single_day_trip_allowed():
    TripFactory(start_date=day(5), end_date=day(10))

    new_trip(day(11), day(11)).clean()


def test_br10_trip_does_not_overlap_itself_on_edit():
    trip = TripFactory(start_date=day(5), end_date=day(10))
    trip.end_date = day(12)

    trip.clean()


def test_missing_dates_are_left_to_the_required_field_errors():
    Trip(title="No dates yet").clean()


def test_end_date_before_start_date_is_refused():
    with pytest.raises(ValidationError) as error:
        new_trip(day(10), day(9)).clean()

    assert error.value.message_dict == {
        "end_date": ["The end date cannot be before the start date."]
    }


# BR-09: editing a trip's dates must not leave its places or journal entries outside them.


def test_br09_new_start_date_cannot_leave_a_place_before_it():
    trip = TripFactory(start_date=day(5), end_date=day(10))
    PlaceFactory(trip=trip, visited_on=day(6))
    trip.start_date = day(7)

    with pytest.raises(ValidationError) as error:
        trip.clean()

    assert error.value.message_dict == {
        "start_date": [
            "A place or journal entry is dated 6 May 2026, before this start date. "
            "Change its date first."
        ]
    }


def test_br09_new_end_date_cannot_leave_a_journal_entry_after_it():
    trip = TripFactory(start_date=day(5), end_date=day(10))
    JournalEntryFactory(trip=trip, date=day(9))
    trip.end_date = day(8)

    with pytest.raises(ValidationError) as error:
        trip.clean()

    assert error.value.message_dict == {
        "end_date": [
            "A place or journal entry is dated 9 May 2026, after this end date. "
            "Change its date first."
        ]
    }


def test_br09_dates_can_change_while_they_still_hold_the_content():
    trip = TripFactory(start_date=day(5), end_date=day(10))
    PlaceFactory(trip=trip, visited_on=day(6))
    JournalEntryFactory(trip=trip, date=day(8))
    trip.start_date, trip.end_date = day(6), day(8)

    trip.clean()


def test_br09_other_trips_content_is_ignored():
    trip = TripFactory(start_date=day(5), end_date=day(10))
    PlaceFactory(trip=TripFactory(start_date=day(20), end_date=day(25)), visited_on=day(20))
    trip.end_date = day(6)

    trip.clean()
