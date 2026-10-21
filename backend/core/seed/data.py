"""The invented trips that `manage.py seed` loads for the demo (#22).

Between them they show every part of the site: a trip over its planned budget and one under it,
expenses in EUR, HUF and RON, a future trip that stays off the world map (BR-13) and a draft that
visitors cannot see (BR-14). Rates are fixed, close to the NBR's, so the seed works offline.
"""

import datetime
from dataclasses import dataclass, field
from decimal import Decimal

from budget.models import Category


@dataclass(frozen=True)
class CityData:
    name: str
    country_code: str
    country_name: str
    latitude: str
    longitude: str


ROME = CityData("Rome", "IT", "Italy", "41.902800", "12.496400")
NAPLES = CityData("Naples", "IT", "Italy", "40.851800", "14.268100")
POSITANO = CityData("Positano", "IT", "Italy", "40.628100", "14.485000")
BUDAPEST = CityData("Budapest", "HU", "Hungary", "47.497900", "19.040200")
LISBON = CityData("Lisbon", "PT", "Portugal", "38.722300", "-9.139300")
SINTRA = CityData("Sintra", "PT", "Portugal", "38.802900", "-9.381700")
PORTO = CityData("Porto", "PT", "Portugal", "41.157900", "-8.629100")
VIENNA = CityData("Vienna", "AT", "Austria", "48.208200", "16.373800")

# RON per 1 unit.
EUR = Decimal("5.085000")
HUF = Decimal("0.012950")


@dataclass(frozen=True)
class PlaceData:
    city: CityData
    visited_on: datetime.date


@dataclass(frozen=True)
class PhotoData:
    """`image` names a file in `photos/`; without one, a placeholder is drawn from `palette`."""

    image: str
    caption: str
    palette: str


@dataclass(frozen=True)
class EntryData:
    date: datetime.date
    title: str
    body: str
    place: CityData | None = None
    photos: tuple[PhotoData, ...] = ()


@dataclass(frozen=True)
class ExpenseData:
    date: datetime.date
    description: str
    category: Category
    amount: str
    currency: str = "RON"
    # The rate the author paid; None means the fixed NBR-like rate of the currency.
    manual_rate: str | None = None


@dataclass(frozen=True)
class TripData:
    title: str
    start_date: datetime.date
    end_date: datetime.date
    summary: str
    status: str
    cover: PhotoData
    planned_budget: Decimal | None = None
    places: tuple[PlaceData, ...] = ()
    entries: tuple[EntryData, ...] = ()
    # Photos in the gallery only, not attached to an entry.
    gallery: tuple[PhotoData, ...] = ()
    expenses: tuple[ExpenseData, ...] = field(default_factory=tuple)


def day(year: int, month: int, n: int) -> datetime.date:
    return datetime.date(year, month, n)


ROME_TRIP = TripData(
    title="Rome and the Amalfi Coast",
    start_date=day(2026, 5, 12),
    end_date=day(2026, 5, 20),
    summary="Nine days from the Colosseum to the cliffs of Positano, with too much pizza.",
    status="published",
    cover=PhotoData("rome-cover.jpg", "Rome at sunset", "sunset"),
    planned_budget=Decimal("9000.00"),
    places=(
        PlaceData(ROME, day(2026, 5, 12)),
        PlaceData(NAPLES, day(2026, 5, 16)),
        PlaceData(POSITANO, day(2026, 5, 17)),
    ),
    entries=(
        EntryData(
            day(2026, 5, 12),
            "Arrival in Rome",
            "We landed at **noon** and went straight to Trastevere.\n\n"
            "## First impressions\n\n"
            "- Cobbled streets and ivy on every wall\n"
            "- Gelato before lunch, which is allowed here\n"
            "- The Colosseum lit up at night",
            place=ROME,
            photos=(
                PhotoData("colosseum.jpg", "The Colosseum at dusk", "dusk"),
                PhotoData("trastevere.jpg", "Ivy in Trastevere", "green"),
            ),
        ),
        EntryData(
            day(2026, 5, 13),
            "The Vatican before the crowds",
            "The first entry slot is worth the early alarm. The **Sistine Chapel** was almost "
            "quiet for ten minutes.\n\nAfterwards we climbed the dome: 551 steps.",
            place=ROME,
            photos=(PhotoData("vatican.jpg", "St Peter's from the dome", "noon"),),
        ),
        EntryData(
            day(2026, 5, 13),
            "Dinner by the river",
            "Cacio e pepe in a place with four tables. We walked back along the Tiber.",
            place=ROME,
        ),
        EntryData(
            day(2026, 5, 16),
            "Pizza in Naples",
            "## The verdict\n\nThe margherita in Naples is **better**. Sorry, Rome.\n\n"
            "1. Margherita\n2. Marinara\n3. Fried pizza from a street stall",
            place=NAPLES,
            photos=(PhotoData("pizza.jpg", "Margherita, Naples", "warm"),),
        ),
        EntryData(
            day(2026, 5, 18),
            "The Path of the Gods",
            "Three hours along the cliffs from Bomerano to Nocelle, then 1,700 steps down to "
            "Positano. **Bring water.**",
            place=POSITANO,
            photos=(
                PhotoData("positano.jpg", "Positano from the path", "sea"),
                PhotoData("cliffs.jpg", "Cliffs above the sea", "sea"),
            ),
        ),
    ),
    gallery=(PhotoData("ferry.jpg", "Ferry to Amalfi", "sea"),),
    expenses=(
        ExpenseData(day(2026, 5, 12), "Flights Bucharest to Rome", Category.TRANSPORT, "1450.00"),
        ExpenseData(
            day(2026, 5, 12), "Hotel in Trastevere", Category.ACCOMMODATION, "640.00", "EUR"
        ),
        ExpenseData(
            day(2026, 5, 13),
            "Vatican Museums tickets",
            Category.ACTIVITIES,
            "60.00",
            "EUR",
            manual_rate="5.102000",
        ),
        ExpenseData(day(2026, 5, 14), "Food in Rome", Category.FOOD_AND_DRINKS, "150.00", "EUR"),
        ExpenseData(day(2026, 5, 16), "Train Rome to Naples", Category.TRANSPORT, "98.00", "EUR"),
        ExpenseData(day(2026, 5, 17), "Hotel in Positano", Category.ACCOMMODATION, "390.00", "EUR"),
        ExpenseData(
            day(2026, 5, 18), "Food on the coast", Category.FOOD_AND_DRINKS, "90.00", "EUR"
        ),
        ExpenseData(day(2026, 5, 19), "Ferry to Amalfi", Category.TRANSPORT, "72.00", "EUR"),
        ExpenseData(day(2026, 5, 19), "Limoncello and ceramics", Category.SHOPPING, "85.00", "EUR"),
    ),
)

BUDAPEST_TRIP = TripData(
    title="A long weekend in Budapest",
    start_date=day(2026, 9, 3),
    end_date=day(2026, 9, 6),
    summary="Thermal baths, ruin bars and the Danube at night.",
    status="published",
    cover=PhotoData("budapest-cover.jpg", "The Danube at night", "night"),
    planned_budget=Decimal("3000.00"),
    places=(PlaceData(BUDAPEST, day(2026, 9, 3)),),
    entries=(
        EntryData(
            day(2026, 9, 4),
            "An afternoon in the baths",
            "Széchenyi has **eighteen pools**. We tried most of them.",
            place=BUDAPEST,
            photos=(PhotoData("baths.jpg", "Széchenyi baths", "noon"),),
        ),
        EntryData(
            day(2026, 9, 5),
            "Ruin bars",
            "Bars in old courtyards, each furnished with whatever was lying around.\n\n"
            "- Szimpla Kert\n- Instant",
            place=BUDAPEST,
        ),
    ),
    gallery=(
        PhotoData("parliament.jpg", "Parliament from the river", "night"),
        PhotoData("chain-bridge.jpg", "Chain Bridge", "dusk"),
    ),
    expenses=(
        ExpenseData(day(2026, 9, 3), "Flights Bucharest to Budapest", Category.TRANSPORT, "820.00"),
        ExpenseData(day(2026, 9, 3), "Hotel by the river", Category.ACCOMMODATION, "96000", "HUF"),
        ExpenseData(day(2026, 9, 4), "Széchenyi baths", Category.ACTIVITIES, "22000", "HUF"),
        ExpenseData(day(2026, 9, 5), "Food and drinks", Category.FOOD_AND_DRINKS, "38500", "HUF"),
        ExpenseData(day(2026, 9, 6), "Taxi to the airport", Category.TRANSPORT, "6200", "HUF"),
    ),
)

LISBON_TRIP = TripData(
    title="Lisbon and Porto",
    start_date=day(2027, 2, 14),
    end_date=day(2027, 2, 21),
    summary="Planned for February: trams, tiles and port wine. Not on the map until we go.",
    status="published",
    cover=PhotoData("lisbon-cover.jpg", "Lisbon rooftops", "warm"),
    planned_budget=Decimal("7000.00"),
    places=(
        PlaceData(LISBON, day(2027, 2, 14)),
        PlaceData(SINTRA, day(2027, 2, 17)),
        PlaceData(PORTO, day(2027, 2, 19)),
    ),
    expenses=(
        ExpenseData(day(2027, 2, 14), "Flights Bucharest to Lisbon", Category.TRANSPORT, "1180.00"),
        ExpenseData(
            day(2027, 2, 14), "Hotel deposit in Porto", Category.ACCOMMODATION, "120.00", "EUR"
        ),
    ),
)

VIENNA_TRIP = TripData(
    title="Vienna at Christmas",
    start_date=day(2025, 12, 19),
    end_date=day(2025, 12, 23),
    summary="Still being written.",
    status="draft",
    cover=PhotoData("vienna-cover.jpg", "Christmas market", "night"),
    places=(PlaceData(VIENNA, day(2025, 12, 19)),),
    entries=(
        EntryData(
            day(2025, 12, 20),
            "Christmas markets",
            "Mulled wine at **Spittelberg**, more to write.",
            place=VIENNA,
        ),
    ),
)

TRIPS = (ROME_TRIP, BUDAPEST_TRIP, LISBON_TRIP, VIENNA_TRIP)
