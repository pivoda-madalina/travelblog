"""US-08: the author uploads JPEG photos with captions to a trip's gallery, optionally attached
to a journal entry. Thumbnails are made on upload. Limits follow #26: 10 MB per photo and 10 photos
per trip. BR-11: deleting a photo or its entry removes the files. BR-14: visitors only see photos of
published trips."""

import io

import pytest
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient

from core import validators
from core.tests.factories import UserFactory
from core.tests.images import image_upload
from journal.models import Photo
from journal.tests.factories import JournalEntryFactory, PhotoFactory
from journal.thumbnails import THUMBNAIL_SIZE
from trips.models import Trip
from trips.tests.factories import TripFactory

pytestmark = pytest.mark.django_db

LIST = reverse("photo-list")


def detail(photo: Photo) -> str:
    return reverse("photo-detail", args=[photo.pk])


def jpeg(width: int, height: int, name: str = "IMG_0412.jpg") -> SimpleUploadedFile:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), "teal").save(buffer, format="JPEG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/jpeg")


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
    return TripFactory()


def upload(client, trip, **fields):
    data = {"trip": trip.pk, "image": image_upload("IMG_0412.jpg"), "caption": "", **fields}
    return client.post(LIST, data, format="multipart")


def test_author_uploads_a_photo_with_a_caption(author, trip):
    response = upload(author, trip, caption="Colosseum at dusk")

    assert response.status_code == 201
    photo = Photo.objects.get()
    body = response.json()
    assert body["caption"] == "Colosseum at dusk"
    assert body["trip"] == trip.pk
    assert body["journal_entry"] is None
    assert body["image"].endswith(photo.image.name)
    assert body["thumbnail"].endswith(photo.thumbnail.name)


def test_photo_attached_to_a_journal_entry(author, trip):
    entry = JournalEntryFactory(trip=trip)

    response = upload(author, trip, journal_entry=entry.pk)

    assert response.status_code == 201
    assert Photo.objects.get().journal_entry == entry


def test_attached_entry_must_belong_to_the_same_trip(author, trip):
    other_entry = JournalEntryFactory()

    response = upload(author, trip, journal_entry=other_entry.pk)

    assert response.status_code == 400
    assert response.json() == {"journal_entry": ["Choose an entry of this trip's journal."]}


def test_thumbnail_created(author, trip):
    upload(author, trip, image=jpeg(2000, 1000))

    photo = Photo.objects.get()
    with Image.open(photo.thumbnail) as thumbnail:
        assert thumbnail.format == "JPEG"
        assert thumbnail.size == (THUMBNAIL_SIZE, THUMBNAIL_SIZE // 2)
    with Image.open(photo.image) as image:
        assert image.size == (2000, 1000)


def test_thumbnail_of_a_small_photo_keeps_its_size(author, trip):
    upload(author, trip, image=jpeg(300, 200))

    with Image.open(Photo.objects.get().thumbnail) as thumbnail:
        assert thumbnail.size == (300, 200)


def test_thumbnail_follows_the_camera_orientation(author, trip):
    buffer = io.BytesIO()
    exif = Image.Exif()
    exif[0x0112] = 6  # Orientation: rotate 90 degrees to display
    Image.new("RGB", (600, 300), "teal").save(buffer, format="JPEG", exif=exif)
    image = SimpleUploadedFile("IMG_0413.jpg", buffer.getvalue(), content_type="image/jpeg")

    upload(author, trip, image=image)

    with Image.open(Photo.objects.get().thumbnail) as thumbnail:
        assert thumbnail.size == (THUMBNAIL_SIZE // 2, THUMBNAIL_SIZE)


def test_non_jpeg_refused(author, trip):
    response = upload(author, trip, image=image_upload("photo.png", image_format="PNG"))

    assert response.status_code == 400
    assert response.json() == {"image": ["The photo must be a JPEG."]}
    assert not Photo.objects.exists()


def test_non_jpeg_with_a_jpeg_name_refused(author, trip):
    response = upload(author, trip, image=image_upload("photo.jpg", image_format="PNG"))

    assert response.status_code == 400
    assert response.json() == {"image": ["The photo must be a JPEG."]}


def test_oversized_file_refused(author, trip, monkeypatch):
    monkeypatch.setattr(validators, "MAX_PHOTO_BYTES", 100)

    response = upload(author, trip)

    assert response.status_code == 400
    assert response.json() == {"image": ["The photo is larger than 10 MB."]}
    assert not Photo.objects.exists()


def test_tenth_photo_is_accepted(author, trip):
    PhotoFactory.create_batch(9, trip=trip)

    response = upload(author, trip)

    assert response.status_code == 201
    assert trip.photos.count() == 10


def test_trip_photo_limit(author, trip):
    PhotoFactory.create_batch(10, trip=trip)
    PhotoFactory(trip=TripFactory())  # another trip's photo does not count

    response = upload(author, trip)

    assert response.status_code == 400
    assert response.json() == {"image": ["A trip can have at most 10 photos."]}


def test_gallery_of_a_trip_in_upload_order(author, trip):
    first = PhotoFactory(trip=trip)
    second = PhotoFactory(trip=trip)
    PhotoFactory()  # another trip's photo

    response = author.get(f"{LIST}?trip={trip.pk}")

    assert [photo["id"] for photo in response.json()] == [first.pk, second.pk]


def test_malformed_trip_filter_finds_nothing(author, trip):
    PhotoFactory(trip=trip)

    assert author.get(f"{LIST}?trip=abc").json() == []


def test_deleting_a_photo_removes_both_files(author, trip, django_capture_on_commit_callbacks):
    upload(author, trip)
    photo = Photo.objects.get()
    names = [photo.image.name, photo.thumbnail.name]
    assert all(default_storage.exists(name) for name in names)

    with django_capture_on_commit_callbacks(execute=True):
        response = author.delete(detail(photo))

    assert response.status_code == 204
    assert not Photo.objects.exists()
    assert not any(default_storage.exists(name) for name in names)


def test_br11_deleting_an_entry_removes_its_photo_files(
    author, trip, django_capture_on_commit_callbacks
):
    entry = JournalEntryFactory(trip=trip)
    upload(author, trip, journal_entry=entry.pk)
    photo = Photo.objects.get()
    names = [photo.image.name, photo.thumbnail.name]

    with django_capture_on_commit_callbacks(execute=True):
        author.delete(reverse("journal-entry-detail", args=[entry.pk]))

    assert not Photo.objects.exists()
    assert not any(default_storage.exists(name) for name in names)


def test_br14_visitor_sees_photos_of_published_trips_only(visitor):
    published = PhotoFactory(trip__status=Trip.Status.PUBLISHED)
    draft = PhotoFactory(trip__status=Trip.Status.DRAFT)

    assert [photo["id"] for photo in visitor.get(LIST).json()] == [published.pk]
    assert visitor.get(detail(draft)).status_code == 404


def test_br14_visitor_cannot_upload_or_delete(visitor, trip):
    photo = PhotoFactory(trip=trip)

    assert upload(visitor, trip).status_code == 403
    assert visitor.delete(detail(photo)).status_code == 403
    assert Photo.objects.count() == 1
