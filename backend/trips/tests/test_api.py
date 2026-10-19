import datetime
from decimal import Decimal

import pytest
from django.core.files.storage import default_storage
from django.urls import reverse
from rest_framework.test import APIClient

from budget.models import Expense
from budget.tests.factories import ExpenseFactory
from core.tests.factories import UserFactory
from core.tests.images import image_upload
from journal.models import JournalEntry, Photo
from journal.tests.factories import JournalEntryFactory, PhotoFactory
from places.models import Place
from places.tests.factories import CityFactory, PlaceFactory
from trips.models import Trip
from trips.tests.factories import TripFactory

pytestmark = pytest.mark.django_db

LIST = reverse("trip-list")


def detail(trip: Trip) -> str:
    return reverse("trip-detail", args=[trip.pk])


@pytest.fixture
def visitor():
    return APIClient()


@pytest.fixture
def author():
    client = APIClient()
    client.force_login(UserFactory())
    return client


def trip_data(**overrides):
    return {
        "title": "Rome and the Amalfi Coast",
        "start_date": "2026-05-12",
        "end_date": "2026-05-20",
        "summary": "Pasta and lemons.",
        "status": "draft",
        **overrides,
    }


def test_author_creates_a_trip_with_a_cover_photo(author):
    response = author.post(LIST, trip_data(cover_photo=image_upload()), format="multipart")

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Rome and the Amalfi Coast"
    assert body["status"] == "draft"
    assert body["cover_photo"].startswith("http://testserver/media/covers/cover")
    trip = Trip.objects.get()
    assert trip.start_date == datetime.date(2026, 5, 12)
    assert trip.cover_photo.name.startswith("covers/")


def test_cover_photo_is_optional(author):
    response = author.post(LIST, trip_data(), format="multipart")

    assert response.status_code == 201
    assert response.json()["cover_photo"] is None


def test_cover_photo_must_be_a_jpeg(author):
    response = author.post(
        LIST, trip_data(cover_photo=image_upload("cover.png", "PNG")), format="multipart"
    )

    assert response.status_code == 400
    assert response.json() == {"cover_photo": ["The photo must be a JPEG."]}


@pytest.mark.parametrize(
    ("when", "start", "end"),
    [
        ("past", "2020-03-01", "2020-03-05"),
        ("in progress", "2026-10-15", "2026-10-25"),
        ("future", "2030-01-01", "2030-01-02"),
    ],
)
def test_trip_can_be_in_the_past_in_progress_or_planned(author, when, start, end):
    response = author.post(LIST, trip_data(start_date=start, end_date=end), format="json")

    assert response.status_code == 201, when


def test_br10_single_day_trip_allowed_through_the_api(author):
    response = author.post(
        LIST, trip_data(start_date="2026-05-12", end_date="2026-05-12"), format="json"
    )

    assert response.status_code == 201


def test_br10_overlapping_trip_is_refused_with_a_field_error(author):
    TripFactory(
        title="Lisbon long weekend",
        start_date=datetime.date(2026, 5, 18),
        end_date=datetime.date(2026, 5, 22),
    )

    response = author.post(LIST, trip_data(), format="json")

    assert response.status_code == 400
    assert response.json() == {
        "start_date": ['This trip overlaps "Lisbon long weekend" (18 May 2026 to 22 May 2026).']
    }
    assert Trip.objects.count() == 1


def test_end_date_before_start_date_is_refused(author):
    response = author.post(
        LIST, trip_data(start_date="2026-05-20", end_date="2026-05-12"), format="json"
    )

    assert response.status_code == 400
    assert response.json() == {"end_date": ["The end date cannot be before the start date."]}


def test_title_and_dates_are_required(author):
    response = author.post(LIST, {}, format="json")

    assert response.status_code == 400
    assert set(response.json()) == {"title", "start_date", "end_date"}


def test_new_trips_are_listed_newest_first_by_creation_date(author):
    older = TripFactory(start_date=datetime.date(2030, 1, 1), end_date=datetime.date(2030, 1, 2))
    newer = TripFactory(start_date=datetime.date(2020, 1, 1), end_date=datetime.date(2020, 1, 2))

    response = author.get(LIST)

    assert [trip["id"] for trip in response.json()] == [newer.pk, older.pk]


def test_br14_draft_hidden_from_visitors(visitor):
    draft = TripFactory(status=Trip.Status.DRAFT)
    published = TripFactory(status=Trip.Status.PUBLISHED)

    assert [trip["id"] for trip in visitor.get(LIST).json()] == [published.pk]
    assert visitor.get(detail(draft)).status_code == 404
    assert visitor.get(detail(published)).status_code == 200


def test_br14_visitor_cannot_create_a_trip(visitor):
    response = visitor.post(LIST, trip_data(), format="json")

    assert response.status_code == 403
    assert not Trip.objects.exists()


def test_br14_planned_budget_is_for_the_author_only(visitor, author):
    trip = TripFactory(planned_budget=Decimal("5000.00"))

    assert "planned_budget" not in visitor.get(detail(trip)).json()
    assert author.get(detail(trip)).json()["planned_budget"] == "5000.00"


def test_author_edits_every_field_and_publishes_a_draft(author):
    trip = TripFactory(status=Trip.Status.DRAFT)

    response = author.patch(
        detail(trip),
        trip_data(status="published", planned_budget="4200.50"),
        format="json",
    )

    assert response.status_code == 200
    trip.refresh_from_db()
    assert trip.title == "Rome and the Amalfi Coast"
    assert (trip.start_date, trip.end_date) == (
        datetime.date(2026, 5, 12),
        datetime.date(2026, 5, 20),
    )
    assert trip.summary == "Pasta and lemons."
    assert trip.status == Trip.Status.PUBLISHED
    assert trip.planned_budget == Decimal("4200.50")


def test_replacing_the_cover_photo_removes_the_old_file(author, django_capture_on_commit_callbacks):
    trip = TripFactory(cover_photo=image_upload("old.jpg"))
    old_name = trip.cover_photo.name

    with django_capture_on_commit_callbacks(execute=True):
        response = author.patch(
            detail(trip), {"cover_photo": image_upload("new.jpg")}, format="multipart"
        )

    assert response.status_code == 200
    trip.refresh_from_db()
    assert trip.cover_photo.name.startswith("covers/new")
    assert default_storage.exists(trip.cover_photo.name)
    assert not default_storage.exists(old_name)


def test_editing_other_fields_keeps_the_cover_photo(author, django_capture_on_commit_callbacks):
    trip = TripFactory(cover_photo=image_upload())

    with django_capture_on_commit_callbacks(execute=True):
        author.patch(detail(trip), {"title": "Renamed"}, format="json")

    assert default_storage.exists(trip.cover_photo.name)


def test_br10_edited_dates_are_checked_for_overlap(author):
    TripFactory(
        title="Lisbon long weekend",
        start_date=datetime.date(2026, 5, 18),
        end_date=datetime.date(2026, 5, 22),
    )
    trip = TripFactory(start_date=datetime.date(2026, 6, 1), end_date=datetime.date(2026, 6, 5))

    response = author.patch(detail(trip), {"start_date": "2026-05-20"}, format="json")

    assert response.status_code == 400
    assert response.json() == {
        "start_date": ['This trip overlaps "Lisbon long weekend" (18 May 2026 to 22 May 2026).']
    }
    trip.refresh_from_db()
    assert trip.start_date == datetime.date(2026, 6, 1)


def test_br09_edited_dates_must_hold_the_trip_content(author):
    trip = TripFactory(start_date=datetime.date(2026, 6, 1), end_date=datetime.date(2026, 6, 5))
    PlaceFactory(trip=trip, visited_on=datetime.date(2026, 6, 4))

    response = author.patch(detail(trip), {"end_date": "2026-06-03"}, format="json")

    assert response.status_code == 400
    assert set(response.json()) == {"end_date"}


def test_br11_author_deletes_a_trip_with_everything_in_it(
    author, django_capture_on_commit_callbacks
):
    trip = TripFactory(cover_photo=image_upload())
    place = PlaceFactory(trip=trip)
    entry = JournalEntryFactory(trip=trip, place=place)
    photos = [PhotoFactory(trip=trip, journal_entry=entry), PhotoFactory(trip=trip)]
    ExpenseFactory(trip=trip)
    kept = TripFactory()
    files = [trip.cover_photo.name, *(photo.image.name for photo in photos)]

    with django_capture_on_commit_callbacks(execute=True):
        response = author.delete(detail(trip))

    assert response.status_code == 204
    assert list(Trip.objects.all()) == [kept]
    assert not Place.objects.exists()
    assert not JournalEntry.objects.exists()
    assert not Photo.objects.exists()
    assert not Expense.objects.exists()
    assert not any(default_storage.exists(name) for name in files)


def test_br14_visitor_cannot_edit_or_delete_a_trip(visitor):
    trip = TripFactory()

    assert visitor.patch(detail(trip), {"title": "Hacked"}, format="json").status_code == 403
    assert visitor.delete(detail(trip)).status_code == 403
    trip.refresh_from_db()
    assert trip.title != "Hacked"


def test_cards_show_the_countries_of_the_trip_places_in_route_order(visitor):
    trip = TripFactory()
    italy = CityFactory(country_code="IT", country_name="Italy")
    PlaceFactory(trip=trip, position=2, city=CityFactory(country_code="FR", country_name="France"))
    PlaceFactory(trip=trip, position=1, city=italy)
    PlaceFactory(
        trip=trip,
        position=3,
        city=CityFactory(country_code="IT", country_name="Italy", name="Naples"),
    )
    TripFactory()

    trips = visitor.get(LIST).json()

    assert [trip["countries"] for trip in trips] == [[], ["Italy", "France"]]
    assert visitor.get(detail(trip)).json()["countries"] == ["Italy", "France"]


def test_listing_trips_costs_no_query_per_trip(visitor, django_assert_num_queries):
    for _ in range(3):
        trip = TripFactory()
        PlaceFactory.create_batch(2, trip=trip)

    # One query for the trips, one for their places with cities.
    with django_assert_num_queries(2):
        response = visitor.get(LIST)

    assert all(len(trip["countries"]) == 1 for trip in response.json())


def test_br14_author_sees_drafts_in_the_list(author):
    draft = TripFactory(status=Trip.Status.DRAFT)
    published = TripFactory(status=Trip.Status.PUBLISHED)

    trips = author.get(LIST).json()

    assert {(trip["id"], trip["status"]) for trip in trips} == {
        (draft.pk, "draft"),
        (published.pk, "published"),
    }


@pytest.mark.parametrize(
    ("value", "saved"), [("5000.00", Decimal("5000.00")), ("0", Decimal("0")), (None, None)]
)
def test_author_sets_a_planned_budget_of_zero_or_more_or_none(author, value, saved):
    trip = TripFactory(planned_budget=Decimal("100.00"))

    response = author.patch(detail(trip), {"planned_budget": value}, format="json")

    assert response.status_code == 200
    trip.refresh_from_db()
    assert trip.planned_budget == saved


def test_planned_budget_cannot_be_negative(author):
    trip = TripFactory()

    response = author.patch(detail(trip), {"planned_budget": "-1.00"}, format="json")

    assert response.status_code == 400
    assert response.json() == {
        "planned_budget": ["Ensure this value is greater than or equal to 0."]
    }


def test_br14_visitor_cannot_set_a_planned_budget(visitor):
    trip = TripFactory()

    response = visitor.patch(detail(trip), {"planned_budget": "10.00"}, format="json")

    assert response.status_code == 403
    trip.refresh_from_db()
    assert trip.planned_budget is None
