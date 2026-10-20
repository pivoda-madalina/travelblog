# Demo script

A 20-minute online screen share (requirements, Demo): about 10 minutes of the product working end to end, then about 7 of the code and tests behind it, with 3 minutes to spare for questions. Timings are targets; the rehearsal log at the end records the real ones.

## Before the call

Half an hour before:

1. Start Docker Desktop, then `make up` and `make seed`. The seed replaces the sample trips, so anything added in a rehearsal is gone.
2. Open two browser windows side by side, each about half the screen:
   - **Author** (left): a normal window, signed in as `author`.
   - **Visitor** (right): a private window, so it has no session.
   Both on <http://localhost:5173>.
3. Open the editor on the repository, with these files in tabs: `backend/trips/models.py`, `backend/budget/conversion.py`, `backend/core/permissions.py`, `backend/core/tests/visitor.py`.
4. Open a terminal in the repository root and run the visitor test once, so the image is warm:
   `docker compose run --rm backend pytest core/tests/test_visitor_access.py -v --no-cov`
5. Check the internet: the map tiles, the place lookup (Nominatim) and the NBR rates need it. Open the [backup screenshots](demo/) in a file viewer, in case they don't.
6. Close notifications and other windows; set the browser zoom to 100%.

## Script

### 1. The product in one sentence (0:00 to 1:00)

> A travel blog for one author: trips on a world map, a journal with photos, and a budget that converts every expense to RON at the National Bank of Romania rate. Visitors read; only the author writes, and the backend enforces that.

Show the README on GitHub for a few seconds: the CI badge and the screenshots.

### 2. What a visitor sees (1:00 to 4:00), visitor window

| Step | Show | Say |
| --- | --- | --- |
| Trips list | Three trips, no draft | The author's draft trip is there, but the API never sends it to a visitor (BR-14). |
| World map | Italy and Hungary highlighted, four pins | One pin per city, however many trips visited it (BR-12). Lisbon is a published trip, but it is in February 2027, so it stays off the map until then (BR-13). |
| Rome and the Amalfi Coast, Route tab | Route line Rome, Naples, Positano | Each trip has its own route; the order is the author's. |
| Journal tab | Entries by day, Markdown, photos | Two entries on 13 May: a day can have several. The text is Markdown with raw HTML switched off. |
| Click a photo | Full-screen viewer, arrow keys, Escape | Thumbnails are generated on upload; the viewer loads the full image. |
| Budget | No Budget tab | Visitors never see money. Show that `/api/expenses/` answers 403 if there is time. |

### 3. What the author does (4:00 to 10:00), author window

Keep the visitor window visible: after each change, refresh it to show the visitor sees published content and nothing else.

| Step | Show | Say |
| --- | --- | --- |
| Trips list | The Vienna draft with its badge | The author sees drafts. |
| New trip, dates 14 to 16 May 2026 | The error under the dates | Trips cannot overlap, drafts included (BR-10). The rule lives in the model, and the form shows the API's message under the field. Cancel. |
| Rome, Route tab | Click near Florence on the map | The backend looks the place up with Nominatim and fills in the city and country. If the lookup fails, the author types them (risk plan). |
| Choose a date and add the place | The route line now ends in Florence | The date picker only offers the trip's days; the API checks the same rule (BR-09). |
| Journal tab, + New entry | Type `## Heading`, `**bold**` and a list | The preview updates as you type (US-07). Save; refresh the visitor window to show the entry. |
| Photos tab, + Upload photos | Drop two JPEGs and a PNG | The dropzone refuses the PNG with its reason; the backend checks the content again with Pillow, so a renamed PNG fails too. |
| Budget tab | Planned 9,000, spent 9,510.75, red difference | Planned versus spent, over budget highlighted (US-13). |
| + Add expense: 50 EUR on 16 May 2026 | The NBR rate appears before saving | The form shows the rate the API will use (BR-02). 16 May is a Saturday, so it takes Friday's rate (BR-03). |
| Type a rate from a bank statement | Saved with a Manual badge | The author can replace the NBR rate (BR-04). The rate is frozen on the expense, so totals never change when new rates are published (ADR 0003). |
| Point at the Total row | 9,510.75 plus the new expense | Totals add up the rounded RON amounts, so the table always adds up (BR-07). |

### 4. The code behind it (10:00 to 17:00), editor and terminal

| Step | Open | Say |
| --- | --- | --- |
| Layout | Repository tree | One repository, Django REST Framework API and React app, run with Docker Compose (ADR 0001). One Django app per area; the frontend mirrors them in `src/features/`. |
| A business rule | `backend/trips/models.py`, `Trip.clean()` | BR-10, no overlapping trips, lives in the model. A serializer mixin runs `clean()` and turns its errors into field errors for the form. |
| The tests named after it | `test_br10_...` in `backend/trips/tests/` | Every business rule has tests named after it, written before the screens that depend on them. |
| Money | `backend/budget/conversion.py`, `convert()` and `to_ron()` | `Decimal` everywhere, rounded half up to the cent. `convert()` is the only place that sets a rate. |
| Permissions | `backend/core/permissions.py` | `IsAuthor` for budget endpoints, reads included; `TripVisibilityMixin` hides drafts, with a 404 so a draft and a missing trip look the same. |
| **The visitor test, live** | `backend/core/tests/visitor.py`, then the terminal | It walks every URL under `/api/` and sends each write as a visitor. A new endpoint is covered as soon as it is routed. Run it (below). |
| CI and history | GitHub: Actions, then the pull request list | Every change came from an issue, through a pull request with green CI; branch protection is on. |

The live test, about 15 seconds:

```sh
docker compose run --rm backend pytest core/tests/test_visitor_access.py -v --no-cov
```

If the interviewers want to see it fail, change `permission_classes = [IsAuthor]` on `ExpenseViewSet` in `backend/budget/views.py` to `[AllowAny]` (import it from `rest_framework.permissions`) and run it again: `test_br14_visitor_cannot_write` fails and names `expense-list` and `expense-detail`. Undo the change with `git checkout backend/budget/views.py`.

### 5. Questions (17:00 to 20:00)

Likely questions and where the answer is:

| Question | Answer and where |
| --- | --- |
| Why freeze the rate on each expense? | Totals must not move when the NBR publishes; [ADR 0003](adr/0003-freeze-exchange-rate-on-expense.md) |
| Why sessions, not tokens? | Same-origin SPA, CSRF built in, nothing stored in the browser; [ADR 0002](adr/0002-session-authentication.md) |
| Why a shared City table? | One pin per city across trips; [ADR 0004](adr/0004-shared-cities-and-trip-places.md) |
| What was cut, and why? | The agreed cut order in [requirements, Priorities](requirements.md); nothing had to be cut |
| What would you do next? | Image storage outside the server, a production deployment, accessibility review |

## If something fails

| Failure | Do this |
| --- | --- |
| Map tiles don't load | Carry on; the pins and countries still draw. Show [02-visitor-world-map.png](demo/02-visitor-world-map.png). |
| Place lookup fails | The form says so and lets you type the city and country (US-04). Say that this is the planned fallback. |
| NBR rates fail | Type a rate; it is saved as Manual (BR-04). Rates already fetched are cached. |
| The app won't start | Show the backup screenshots in order, then go straight to the code. |

## Backup screenshots

In [demo/](demo/), taken from the seeded site:

| File | Shows |
| --- | --- |
| [01-visitor-trips.png](demo/01-visitor-trips.png) | Visitor's trip list, no draft |
| [02-visitor-world-map.png](demo/02-visitor-world-map.png) | World map with Italy and Hungary |
| [03-visitor-route.png](demo/03-visitor-route.png) | Rome trip route |
| [04-visitor-journal.png](demo/04-visitor-journal.png) | Journal with Markdown and photos |
| [05-visitor-photos.png](demo/05-visitor-photos.png) | Photo gallery |
| [06-visitor-photo-viewer.png](demo/06-visitor-photo-viewer.png) | Full-screen viewer |
| [07-author-trips-with-draft.png](demo/07-author-trips-with-draft.png) | Author's trip list with the draft |
| [08-author-entry-editor.png](demo/08-author-entry-editor.png) | Entry editor with live preview |
| [09-author-add-place.png](demo/09-author-add-place.png) | Add place window after a click on the route map, with the looked-up city |
| [10-author-expense-form.png](demo/10-author-expense-form.png) | Expense with its saved NBR rate |
| [11-author-budget.png](demo/11-author-budget.png) | Budget summary, over budget |
| [12-author-expenses.png](demo/12-author-expenses.png) | Expense table with rates, sources and total |

## Rehearsal log

| Date | Total time | Product | Code | What to change |
| --- | --- | --- | --- | --- |
| | | | | |
| | | | | |
