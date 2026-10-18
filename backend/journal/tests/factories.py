import factory

from journal.models import JournalEntry, Photo
from trips.tests.factories import TripFactory


class JournalEntryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = JournalEntry

    trip = factory.SubFactory(TripFactory)
    date = factory.LazyAttribute(lambda entry: entry.trip.start_date)
    title = factory.Sequence(lambda n: f"Day {n}")
    body = "We walked the old town."


class PhotoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Photo

    trip = factory.SubFactory(TripFactory)
    image = factory.django.ImageField(width=40, height=30)
    caption = factory.Sequence(lambda n: f"Photo {n}")
