import datetime
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.tests.factories import UserFactory
from core.tests.images import image_upload
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


def test_editing_and_deleting_arrive_with_issue_9(author):
    trip = TripFactory()

    assert author.patch(detail(trip), {"title": "New"}, format="json").status_code == 405
    assert author.delete(detail(trip)).status_code == 405
