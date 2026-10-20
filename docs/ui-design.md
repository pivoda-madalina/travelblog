# UI design

The visual direction and low-fidelity wireframes for every screen. Components come from Mantine ([ADR 0005](adr/0005-mantine-component-library.md)); the user stories and business rules are in [requirements.md](requirements.md).

The wireframes show layout and content, not final pixels. Anything marked **[author]** is rendered only for the signed-in author; visitors never see it (BR-14).

## Visual direction

A calm, photo-first travel journal: white space, large cover photos, one strong colour for actions and the map, and a serif for reading.

| Token | Value | Used for |
| --- | --- | --- |
| Primary colour | Mantine `teal` | Buttons, links, active tab, route lines, visited countries |
| Accent colour | Mantine `orange` | Map pins, the "Draft" badge |
| Danger colour | Mantine `red` | Delete buttons, over-budget amounts (US-13) |
| Neutral | Mantine `gray` | Borders, secondary text, empty states |
| Background | White page, `gray.0` for the header and side panels | |
| UI font | Inter (`@fontsource/inter`) | Navigation, forms, tables, numbers |
| Reading font | Lora (`@fontsource/lora`) | Trip titles, journal headings and body text |
| Radius | `md` | Cards, inputs, modals |
| Page width | `Container size="xl"` (1320 px), minimum supported viewport 1280 px | Desktop only, no breakpoints |
| Theme | Light only | |

Money is always shown with two decimals and the currency code after the amount, for example `1,234.50 RON`: a comma between thousands and a point before the decimals. Exchange rates show four decimals, for example `4.9750`. Dates are shown as `12 May 2026`.

## App shell

Every page shares one header. The world map page uses the full width below it; every other page sits in the centred container.

```
+--------------------------------------------------------------------------------+
| (logo) Travel Blog        Trips   World map                         [Sign in]  |
+--------------------------------------------------------------------------------+
|                                                                                |
|                               page content                                    |
|                                                                                |
+--------------------------------------------------------------------------------+
```

Signed in, the right side of the header changes:

```
|                                            [+ New trip]   Author (v)           |
|                                                           | Sign out |         |
```

## Screens

| # | Screen | Route | Stories |
| --- | --- | --- | --- |
| 1 | Trip list | `/` | US-01, US-03 |
| 2 | Trip form | `/trips/new`, `/trips/:id/edit` | US-01, US-02 |
| 3 | Trip page: Route tab | `/trips/:id` | US-04, US-06 |
| 4 | Trip page: Journal tab | `/trips/:id/journal` | US-07, US-09 |
| 5 | Trip page: Photos tab | `/trips/:id/photos` | US-08, US-09 |
| 6 | Trip page: Budget tab **[author]** | `/trips/:id/budget` | US-10 to US-13 |
| 7 | World map | `/map` | US-05 |
| 8 | Sign in | `/sign-in` | Authentication |

### 1. Trip list

Newest trip first by creation date (US-01). Three cards per row. Countries come from the trip's places; a trip without places shows none (US-03).

```
+--------------------------------------------------------------------------------+
|  Trips                                                    [+ New trip] [a]     |
|                                                                                |
|  +---------------------+  +---------------------+  +---------------------+     |
|  |                     |  |                     |  | [Draft]         [a] |     |
|  |      cover photo    |  |      cover photo    |  |      cover photo    |     |
|  |                     |  |                     |  |                     |     |
|  +---------------------+  +---------------------+  +---------------------+     |
|  | Rome and the Amalfi |  | Lisbon long weekend |  | Japan in spring     |     |
|  | Coast               |  | 3-6 Mar 2026        |  | 2-18 Apr 2027       |     |
|  | 12-20 May 2026      |  | Portugal            |  | (no places yet)     |     |
|  | Italy               |  |                     |  |                     |     |
|  +---------------------+  +---------------------+  +---------------------+     |
+--------------------------------------------------------------------------------+
```

- [a] marks author-only elements. Draft trips are visible only to the author and carry an orange "Draft" badge.
- Empty state: "No trips yet." For the author, a "Create your first trip" button is added.
- The whole card links to the trip page.

### 2. Trip form [author]

One form for create and edit. The cover photo is uploaded on its own, separately from the gallery (US-01).

```
+--------------------------------------------------------------------------------+
|  New trip                                                                      |
|                                                                                |
|  Title           [ Rome and the Amalfi Coast                             ]     |
|  Dates           [ 12 May 2026  ->  20 May 2026 ]   (date range picker)        |
|                  ! This trip overlaps "Lisbon long weekend" (3-6 Mar).         |
|  Summary         [                                                       ]     |
|                  [                                                       ]     |
|  Cover photo     +-----------------------------+                               |
|                  |  Drop a JPEG here or browse |   (current cover thumbnail)   |
|                  +-----------------------------+                               |
|  Status          ( Draft | Published )   (segmented control)                  |
|                                                                                |
|                                                     [Cancel]  [Save trip]      |
|  ----------------------------------------------------------------------------  |
|  Danger zone (edit only)                                    [Delete trip]      |
+--------------------------------------------------------------------------------+
```

- Field errors come from the API and appear under the field, like the BR-10 overlap message above. The date picker allows a single-day trip.
- Delete opens a confirmation modal: "Delete 'Rome and the Amalfi Coast'? Its places, journal entries, photos and expenses will be deleted too." [Cancel] [Delete] (US-02, BR-11).
- After saving, a notification confirms it and the trip page opens.

### Trip page header (shared by tabs 3 to 6)

```
+--------------------------------------------------------------------------------+
|  +--------------------------------------------------------------------------+  |
|  |                         cover photo (wide banner)                        |  |
|  |  Rome and the Amalfi Coast                                               |  |
|  |  12 May - 20 May 2026 · Italy                     [Edit] [Delete]  [a]   |  |
|  +--------------------------------------------------------------------------+  |
|  Summary text in the reading font, two or three lines.                         |
|                                                                                |
|  [ Route ]  [ Journal ]  [ Photos ]  [ Budget ] [a]                            |
+--------------------------------------------------------------------------------+
```

The Budget tab is not rendered for visitors, and its route returns the visitor to the Route tab.

### 3. Route tab

The map shows the trip's places joined by straight teal lines in the author's order. A trip with one place shows only its pin (US-06).

```
+--------------------------------------------------------------------------------+
|  +--------------------------------------------------+  Route                   |
|  |                                                  |                          |
|  |   (1)Rome                                        |  1 Rome, Italy           |
|  |      \                                           |    12 May 2026 [^][v][x] |
|  |       \                                          |  2 Naples, Italy         |
|  |        (2)Naples                                 |    15 May 2026 [^][v][x] |
|  |            \                                     |  3 Positano, Italy       |
|  |             (3)Positano                          |    17 May 2026 [^][v][x] |
|  |                                                  |                          |
|  |  Leaflet map, about two thirds of the width      |  [a] Click the map to    |
|  +--------------------------------------------------+      add a place         |
+--------------------------------------------------------------------------------+
```

Adding a place [author] (US-04). Clicking the map drops a temporary pin and opens a modal:

```
+------------------------------------------+
|  Add place                               |
|                                          |
|  Name      [ Positano              ]     |   (filled in from the clicked point)
|  Country   Italy                         |   (filled in, read only)
|  Visited   [ 17 May 2026 ]               |   (limited to the trip dates, BR-09)
|                                          |
|              [Cancel]  [Add place]       |
+------------------------------------------+
```

- While the lookup runs, the name field shows a loader. If the lookup fails, an inline message says "Couldn't look up this location. Type the city name and country." and both fields become editable (demo risk mitigation).
- [^] and [v] move a place in the route; [x] deletes it after a confirmation.
- Empty state: "No places yet." For the author, the hint to click the map is added.

### 4. Journal tab

Entries in date order, grouped by day (US-09). Several entries can share a day (US-07).

```
+--------------------------------------------------------------------------------+
|                                                          [+ New entry]  [a]    |
|  Tuesday, 12 May 2026                                                          |
|  ----------------------------------------------------------------------------  |
|  Arrival in Rome                                    (pin) Rome   [Edit]  [a]   |
|  Rendered Markdown in the reading font: paragraphs, **bold**, lists and        |
|  headings...                                                                   |
|  +------+ +------+ +------+                                                    |
|  | img  | | img  | | img  |    attached photo thumbnails                       |
|  +------+ +------+ +------+                                                    |
|                                                                                |
|  Wednesday, 13 May 2026                                                        |
|  ----------------------------------------------------------------------------  |
|  The Vatican before the crowds                      (pin) Rome   [Edit]  [a]   |
|  ...                                                                           |
+--------------------------------------------------------------------------------+
```

Entry editor [author], a modal at full width. Live preview on the right (US-07):

```
+--------------------------------------------------------------------------------+
|  New journal entry                                                             |
|  Date [ 12 May 2026 ]   Place [ Rome (optional)    v ]   Title [ Arrival...  ] |
|                                                                                |
|  Markdown                               |  Preview                             |
|  +-----------------------------------+  |  Arrival in Rome                     |
|  | ## Arrival in Rome                |  |  ----------------                    |
|  | We landed at **noon** and...      |  |  We landed at noon and...            |
|  | - Trastevere                      |  |  • Trastevere                        |
|  | - Gelato                          |  |  • Gelato                            |
|  +-----------------------------------+  |                                      |
|  Headings (##), **bold** and - lists     |                                      |
|                                                                                |
|  [Delete entry] (edit only)                          [Cancel]  [Save entry]    |
+--------------------------------------------------------------------------------+
```

- Deleting an entry warns that its attached photos are deleted too (BR-11).
- Raw HTML in Markdown is not rendered (architecture, Stack).

### 5. Photos tab

The gallery grid shows thumbnails, four or five per row, with the caption below each one (US-08).

```
+--------------------------------------------------------------------------------+
|                                                       [+ Upload photos]  [a]   |
|  +--------+ +--------+ +--------+ +--------+ +--------+                        |
|  |  img   | |  img   | |  img   | |  img   | |  img   |                        |
|  +--------+ +--------+ +--------+ +--------+ +--------+                        |
|  Colosseum  Trevi      Pasta      Positano   Ferry                             |
+--------------------------------------------------------------------------------+
```

Upload [author], a modal with a dropzone. It accepts several JPEGs at once, each with its own caption:

```
+------------------------------------------------------------+
|  Upload photos                                             |
|  +------------------------------------------------------+  |
|  |     Drop JPEG files here or browse  (max [limit])    |  |
|  +------------------------------------------------------+  |
|  [thumb] IMG_0412.jpg   Caption [ Colosseum at dusk  ] [x] |
|  [thumb] IMG_0413.jpg   Caption [                    ] [x] |
|                                                            |
|  Attach to entry [ None (gallery only)               v ]   |
|                                    [Cancel]  [Upload 2]    |
+------------------------------------------------------------+
```

- Files that are not JPEGs or are too large are rejected in the dropzone with a reason. The backend validates again (Pillow).
- The size limit is open question #26.

Full-screen viewer (US-09, first on the cut list). Clicking any photo, here or in the journal, opens it:

```
+--------------------------------------------------------------------------------+
|                                                                         [x]    |
|                                                                                |
|   [<]                     photo at full size, dark backdrop               [>]  |
|                                                                                |
|                       Colosseum at dusk · 3 / 12                               |
+--------------------------------------------------------------------------------+
```

The arrow keys and Escape work too. If US-09's viewer is cut, clicking a thumbnail opens the full image in a plain modal.

### 6. Budget tab [author]

Visible to the author only; the API refuses these reads for visitors (BR-14). All totals are in RON (BR-01).

```
+--------------------------------------------------------------------------------+
|  +------------------+  +------------------+  +------------------------------+  |
|  | Planned          |  | Spent            |  | Difference                   |  |
|  | 5,000.00 RON [e] |  | 5,412.30 RON     |  | -412.30 RON  over budget     |  |
|  +------------------+  +------------------+  +------------------------------+  |
|                                                (red when spent > planned)      |
|  By category                                                                   |
|  Accommodation    ██████████████████████  2,400.00 RON                         |
|  Food and drinks  ████████████            1,310.50 RON                         |
|  Transport        ████████                  890.00 RON                         |
|  Activities       █████                     611.80 RON                         |
|  Shopping         ██                        200.00 RON                         |
|  Other                                        0.00 RON                         |
|                                                                                |
|  Expenses                                                     [+ Add expense]  |
|  Date      Description      Category       Amount      Rate        RON         |
|  12 May    Hotel Trastevere Accommodation  480.00 EUR  4.9750 NBR  2,388.00    |
|  13 May    Vatican tickets  Activities      60.00 EUR  4.9802 Manual 298.81    |
|  13 May    Taxi to airport  Transport      120.00 RON  -            120.00     |
|                                                    Total            5,412.30   |
+--------------------------------------------------------------------------------+
```

- [e] edits the planned budget inline, zero or more (US-10). Without a planned budget, the Planned and Difference cards show "Not set" (US-10 is on the cut list; the Spent card and the categories still work without it).
- The rate column shows the rate used and a badge for its source, NBR or Manual (US-12). RON expenses show no rate (BR-06).
- The category bars use Mantine `Progress`, so no chart library is needed.
- Clicking a row opens it for editing.

Expense form [author], a modal (US-11, US-12):

```
+------------------------------------------------------+
|  Add expense                                         |
|  Date         [ 13 May 2026 ]                        |
|  Description  [ Vatican tickets              ]       |
|  Category     [ Activities                 v ]       |   (BR-08 list)
|  Amount       [ 60.00        ]  Currency [ EUR v ]   |
|  Rate         [              ]  RON per 1 EUR        |
|               Leave empty to use the NBR rate for    |
|               the date. Enter the rate from your     |
|               bank statement to override it.         |
|                                                      |
|  [Delete] (edit only)            [Cancel]  [Save]    |
+------------------------------------------------------+
```

- Rate rules and conversion run on the backend (BR-02 to BR-05). The form sends an empty rate to mean "use NBR", and after saving the table shows the rate, its source and the RON amount.
- As soon as the date and currency are chosen, the NBR rate that would be used appears as the Rate placeholder, with the date it was published (US-12). When editing an expense with an NBR rate, the saved rate is shown instead and kept unless the date or currency changes (BR-05).
- If the NBR has no rate for the currency, or the feed is unreachable, the API returns a field error on Rate, for example "No NBR rate for this currency. Enter the rate you paid." (BR-04).
- The rate field is hidden when the currency is RON (BR-06).
- When editing, changing the date or currency clears a manual rate so it is looked up again (BR-02). Changing only the amount keeps the saved rate (BR-05).

### 7. World map

A full-width Leaflet map below the header. Visited countries are filled teal, and each visited city has one orange pin (US-05, BR-12, BR-13).

```
+--------------------------------------------------------------------------------+
| (logo) Travel Blog        Trips   World map                         [Sign in]  |
+--------------------------------------------------------------------------------+
|                                                                                |
|      ░░░░  visited countries filled teal                                       |
|                         o Lisbon        o Rome                                 |
|                                          +-----------------------------+       |
|                                          | Rome, Italy                 |       |
|                                          | Rome and the Amalfi Coast   |       |
|                                          |   12 May 2026  ->           |       |
|                                          | Weekend in Rome             |       |
|                                          |   8 Nov 2025  ->            |       |
|                                          +-----------------------------+       |
|  +-------------------------+                                                   |
|  | 2 countries · 5 cities  |   (small summary card, bottom left)               |
|  +-------------------------+                                                   |
+--------------------------------------------------------------------------------+
```

- The popup lists every published trip that visited the city, with dates and links (US-05).
- Planned places and drafts are not shown, for the author as well, because the map is the public view (BR-13).
- Empty state: an overlay that reads "No places visited yet."

### 8. Sign in

```
+--------------------------------------------------------------------------------+
|                                                                                |
|                       +--------------------------------+                       |
|                       |  Sign in                       |                       |
|                       |  Username  [                 ] |                       |
|                       |  Password  [                 ] |                       |
|                       |  ! Wrong username or password. |                       |
|                       |                    [Sign in]   |                       |
|                       +--------------------------------+                       |
|                                                                                |
+--------------------------------------------------------------------------------+
```

There is no sign-up and no password reset (out of scope). After signing in, the author returns to the page they came from.

## States used on every screen

| State | Treatment |
| --- | --- |
| Loading | Mantine `Skeleton` in the shape of the content (cards, table rows); the map shows a centred `Loader` |
| Empty | One sentence in `gray`, plus the create action for the author |
| Field error | The API error message under the field (`form.setErrors()`) |
| Other API error | A red notification: "Something went wrong. Try again." The form keeps its values |
| Not found or draft | A "Trip not found" page with a link back to Trips; visitors get the same page for drafts (404, architecture, Permissions) |
| Saved or deleted | A green notification in the bottom right |

## Author and visitor differences

The demo shows both side by side, so this is the checklist for the frontend tests in "Visitor view without edit controls" (architecture, Testing strategy).

| Element | Author | Visitor |
| --- | --- | --- |
| New trip, Edit, Delete, Add place, New entry, Upload, Add expense | Shown | Not rendered |
| Draft trips and the Draft badge | Shown | Not rendered; draft URLs show "Trip not found" |
| Budget tab | Shown | Not rendered |
| Route reorder and delete buttons | Shown | Not rendered |
| World map | Public places only | Public places only |
| Header | Author menu with Sign out | Sign in button |
