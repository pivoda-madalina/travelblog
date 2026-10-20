"""Loads the sample trips of `data.py` (#22). Every record goes through `full_clean()`, so the
sample data keeps the business rules like anything the author enters."""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction

from budget.conversion import to_ron
from budget.models import Expense, RateSource
from core.seed import data
from core.seed.images import photo_file
from journal.models import JournalEntry, Photo
from places.models import City, Place
from trips.models import Trip

RATES = {"EUR": data.EUR, "HUF": data.HUF, "RON": Decimal("1")}


def seed_author(username: str, password: str):
    """The author account, created or given this password, so it signs in after every run."""
    user, _ = get_user_model().objects.get_or_create(username=username)
    user.set_password(password)
    user.full_clean()
    user.save()
    return user


@transaction.atomic
def seed_trips() -> list[Trip]:
    """Replaces the sample trips, found by title, so running the seed twice gives the same
    data. Other trips are left alone; one overlapping a sample trip stops the seed (BR-10)."""
    titles = [trip.title for trip in data.TRIPS]
    # One by one, so the delete signals remove each trip's files (BR-11).
    for trip in Trip.objects.filter(title__in=titles):
        trip.delete()
    return [_create_trip(trip_data) for trip_data in data.TRIPS]


def _create_trip(trip_data: data.TripData) -> Trip:
    trip = Trip(
        title=trip_data.title,
        start_date=trip_data.start_date,
        end_date=trip_data.end_date,
        summary=trip_data.summary,
        status=trip_data.status,
        planned_budget=trip_data.planned_budget,
        cover_photo=photo_file(trip_data.cover.image, trip_data.cover.palette),
    )
    _save(trip)

    places = {}
    for position, place_data in enumerate(trip_data.places):
        place = Place(
            trip=trip,
            city=_city(place_data.city),
            visited_on=place_data.visited_on,
            position=position,
        )
        _save(place)
        places.setdefault(place_data.city, place)

    for entry_data in trip_data.entries:
        entry = JournalEntry(
            trip=trip,
            date=entry_data.date,
            title=entry_data.title,
            body=entry_data.body,
            place=places.get(entry_data.place),
        )
        _save(entry)
        for photo_data in entry_data.photos:
            _save_photo(trip, photo_data, entry)
    for photo_data in trip_data.gallery:
        _save_photo(trip, photo_data, None)

    for expense_data in trip_data.expenses:
        manual = expense_data.manual_rate is not None
        rate = Decimal(expense_data.manual_rate) if manual else RATES[expense_data.currency]
        amount = Decimal(expense_data.amount)
        expense = Expense(
            trip=trip,
            date=expense_data.date,
            description=expense_data.description,
            category=expense_data.category,
            amount=amount,
            currency=expense_data.currency,
            rate=rate,
            rate_source=RateSource.MANUAL if manual else RateSource.NBR,
            amount_ron=to_ron(amount, rate),
        )
        _save(expense)
    return trip


def _city(city: data.CityData) -> City:
    return City.objects.find_or_create(
        name=city.name,
        country_code=city.country_code,
        country_name=city.country_name,
        latitude=Decimal(city.latitude),
        longitude=Decimal(city.longitude),
    )


def _save_photo(trip: Trip, photo_data: data.PhotoData, entry: JournalEntry | None) -> None:
    photo = Photo(
        trip=trip,
        journal_entry=entry,
        image=photo_file(photo_data.image, photo_data.palette),
        caption=photo_data.caption,
    )
    _save(photo)


def _save(instance) -> None:
    instance.full_clean()
    instance.save()
