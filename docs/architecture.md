# Architecture and engineering guidelines

This document sets the technical direction for the project. The requirements live in [requirements.md](requirements.md); significant decisions are recorded in [adr/](adr/).

## Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Backend | Python 3.13, Django 5.2 LTS, Django REST Framework | JSON API under `/api/` |
| Database | PostgreSQL 17 | Runs in Docker |
| Frontend | React 19, TypeScript (strict), Vite | Single-page app |
| Routing and data | React Router, TanStack Query | Server state lives in TanStack Query; no global store |
| UI components | Mantine | Theme, forms, dates, dropzone, carousel, notifications; see [ADR 0005](adr/0005-mantine-component-library.md) and [ui-design.md](ui-design.md) |
| Map | Leaflet with react-leaflet, OpenStreetMap tiles | Country shapes from a bundled Natural Earth GeoJSON file |
| Place lookup | OpenStreetMap Nominatim reverse geocoding | Called from the backend only |
| Exchange rates | National Bank of Romania daily XML feed | Called from the backend only, cached in the database |
| Markdown | Stored as Markdown, rendered with react-markdown | Raw HTML is disabled to prevent script injection |
| Images | Pillow | JPEG validation and thumbnail generation on upload |
| Python tooling | uv, Ruff (lint and format), pytest, pytest-django, factory_boy, coverage, respx | |
| Frontend tooling | ESLint, Prettier, Vitest, React Testing Library | |
| Delivery | Docker Compose, GitHub Actions, pre-commit | |

Exact versions are pinned in lock files when the project is scaffolded.

## Repository layout

```
backend/
  config/            Django settings, root URLs, WSGI
  trips/             Trip
  places/            City, Place, reverse geocoding client
  journal/           JournalEntry, Photo
  budget/            Expense, ExchangeRate, NBR rates client, budget summary
  core/              Shared permissions, authentication views, test helpers
frontend/
  src/api/           Typed API client and TanStack Query hooks
  src/features/      trips/, map/, journal/, budget/, auth/
  src/components/    Shared UI components
  src/pages/         Route-level screens
docs/
docker-compose.yml
Makefile             Short commands: make up, make test, make lint, make seed
```

## Domain model

| Model | Key fields | Rules |
| --- | --- | --- |
| Trip | title, start_date, end_date, summary, cover_photo, status (draft or published), planned_budget, created_at | BR-10 no overlap; end date not before start date |
| City | name, country_code, country_name, latitude, longitude | Unique per name and country; shared across trips (BR-12) |
| Place | trip, city, visited_on, position | Date within the trip (BR-09); position sets the route order |
| JournalEntry | trip, place (optional), date, title, body (Markdown) | Date within the trip (BR-09) |
| Photo | trip, journal_entry (optional), image, thumbnail, caption | Deleted with its journal entry (BR-11) |
| Expense | trip, date, description, category, amount, currency, rate, rate_source (nbr or manual), amount_ron | Rate frozen on the expense (BR-05) |
| ExchangeRate | currency, date, rate (RON per 1 unit) | Unique per currency and date; cache of NBR rates |

Deleting a trip cascades to its places, journal entries, photos and expenses (BR-11). Cities are never deleted with a trip because other trips may share them.

## Backend conventions

- **Business rules live in the domain layer.** Validation goes in model `clean()` methods or small service functions, and serializers call them. A rule is never enforced only in a view or only in the frontend.
- **Money is always `Decimal`, never `float`.** Amounts use 2 decimal places, rates use 6. Rounding is `ROUND_HALF_UP` to 2 decimal places, and totals add up the rounded amounts (BR-07).
- **NBR rates are per unit.** Some currencies are published per 100 units (for example HUF and JPY), so the client divides by the published multiplier before saving.
- **External services sit behind thin client modules** (`budget/nbr.py`, `places/geocoding.py`) with timeouts, and their failures return a clear error instead of a crash. Tests never call the network; HTTP is mocked with respx.
- **API design:** plural resource names (`/api/trips/`, `/api/places/?trip=12`), standard DRF error format, no pagination (the data set is small).
- **Permissions:** the default is read-only for anonymous users. Draft trips and everything under them return 404 to visitors, so their existence is not revealed. Budget and expense endpoints require sign-in, including for reads (BR-14). Endpoints build on the shared pieces: `TripVisibilityMixin` and `IsAuthor` in `core/permissions.py`, and `AuthorOnlyFieldsMixin` in `core/serializers.py` for fields such as `planned_budget`. A shared test in `core/tests/` finds every endpoint under `/api/` and checks that visitors cannot write to it.
- **Authentication:** Django session authentication with CSRF protection. The frontend is served from the same origin, through the Vite proxy in development (see [ADR 0002](adr/0002-session-authentication.md)).
- **Configuration comes from environment variables.** `.env.example` lists them; real secrets are never committed.

## Frontend conventions

- One folder per feature under `src/features/`, holding its components, hooks and types.
- All server calls go through the typed client in `src/api/`. Components never call `fetch` directly.
- The backend is the source of truth for business rules. Forms show the validation errors the API returns, and frontend checks exist only for convenience.
- Visitor screens never render edit controls, and the API refuses edits anyway.
- Desktop layout only; no responsive breakpoints are needed.
- Screens follow the wireframes and theme in [ui-design.md](ui-design.md). Colours and fonts come from the Mantine theme in `src/theme.ts`, never hard-coded.

## Testing strategy

| Layer | What is tested | Tools |
| --- | --- | --- |
| Domain | Every business rule BR-01 to BR-14, including edge cases | pytest, factory_boy |
| API | Visibility of drafts, budgets and expenses; writes refused for visitors; validation errors | pytest, DRF test client |
| External clients | NBR XML parsing, weekend and holiday fallback, multipliers; geocoding responses and failures | pytest, respx |
| Frontend | Budget display, forms showing API errors, visitor view without edit controls | Vitest, React Testing Library |

- Business rule tests are named after the rule, for example `test_br10_trips_cannot_overlap`, so a reviewer can trace each rule to its test.
- Business rule tests are written before the screens that depend on them.
- Coverage is reported in CI. The target is at least 90% for the backend domain apps.
- End-to-end browser tests are out of scope for the one-week timeline; the demo checklist covers the full flow manually.

## Quality gates

| Where | Checks |
| --- | --- |
| pre-commit (local) | Ruff lint and format, ESLint, Prettier, trailing whitespace, no large files |
| CI (every pull request) | Same lint checks, backend tests with coverage, frontend tests, frontend type check and build |
| `main` branch | Protected: changes only through pull requests with passing CI |
