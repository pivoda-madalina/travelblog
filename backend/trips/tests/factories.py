import datetime

import factory

from trips.models import Trip


class TripFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Trip

    title = factory.Sequence(lambda n: f"Trip {n}")
    # Each trip gets its own week, so factory trips never overlap (BR-10).
    start_date = factory.Sequence(lambda n: datetime.date(2025, 1, 1) + datetime.timedelta(weeks=n))
    end_date = factory.LazyAttribute(lambda trip: trip.start_date + datetime.timedelta(days=4))
    summary = "A short summary."
    status = Trip.Status.PUBLISHED
