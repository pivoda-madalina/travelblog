# Travel Blog – Business Analyst Hand-off

Oct 15, 2026 · @Mada · Updated with product owner decisions

## Project summary

The Travel Blog is a personal website where one author records trips, shows every visited place on an interactive world map, writes a detailed journal with photos, and tracks trip spending across currencies.

It is a portfolio project for a full-stack developer (Python and React) interview, so it must be a complete, working product that can be demonstrated live from start to finish and whose code holds up to review.

## Context and constraints

The project has one owner, one week and a fixed technology stack, so scope must stay small and finishable.

| Constraint | Detail |
| --- | --- |
| Purpose | Portfolio piece for a full-stack developer (Python and React) interview. Interviewers will review the code, tests and Git history |
| Deadline | One week from kick-off on 15 October 2026 (22 October, the interview date) |
| Demo | 20-minute online interview with screen sharing, run from the owner's laptop |
| Team | One person designs, builds, tests and presents the product |
| Users | Single author; everyone else can only read |
| Platform | Desktop browsers only |
| Technology | Fixed by the owner: Python, Django, React, PostgreSQL, Git, pytest, run with Docker. Technical design is out of scope for this document |

## Objectives and success criteria

Success means a live demo that runs end to end without errors and a product the owner can explain decision by decision.

**Objectives**

1. Deliver a working product with all four core features: trips, interactive map, journal with photos, and multi-currency budget.
2. Show professional working habits: automated tests, a clean change history and clear documentation.
3. Give the owner a clear story to tell in the interview: the problem, the features, and the key decisions.

**Success criteria**

- [ ] A full trip can be created live: places picked on the map, a journal entry, photos and expenses.
- [ ] The world map shows every visited place and highlights visited countries.
- [ ] Budget totals are shown correctly in RON, including expenses paid in other currencies.
- [ ] The visitor view shows no edit controls, draft trips, budgets or expenses.
- [ ] Invented sample trips are pre-loaded so the site looks complete when the demo starts.
- [ ] The business rules in this document are covered by automated tests that pass.
- [ ] A reviewer can set up and run the project with Docker by following the written instructions.

## Priorities

The interactive map and the currency conversion are the showpieces and must be finished; everything else can be trimmed if time runs short.

If time runs short, features are cut in this order:

1. Full-screen photo viewer (US-09)
2. Planned versus spent comparison (US-10 and that part of US-13)
3. Journal formatting (US-07; entries fall back to plain text)

## Users and roles

There are two roles: one author who manages all content, and visitors who can only read.

| Role | Who | Can do | Cannot do |
| --- | --- | --- | --- |
| Author | The project owner, signed in through the site's own sign-in screen | Create, edit and delete trips, places, journal entries, photos and expenses; save trips as drafts; view budgets and expenses | Nothing restricted |
| Visitor | Anyone with the website link | Browse published trips, the map, the journal and photos | Change any content; see draft trips, budgets or expenses |

All authoring happens on custom screens in the website, not in Django's built-in admin. Visitor restrictions are enforced by the backend, not only hidden in the screens.

## Scope overview

The first release contains four features, all required for the interview demo.

| Feature | What it does | Main value |
| --- | --- | --- |
| Trips | Groups everything about one journey: title, dates, summary and cover photo; saved as draft or published | One place to find each trip |
| Interactive map | World map with a pin for every visited city, visited countries highlighted, and each trip's route in the author's chosen order | See where you have been at a glance |
| Journal and photos | Day-by-day entries written in Markdown, and a photo gallery for each trip | Tell the story of the trip |
| Budget calculator | Expenses recorded in any currency and converted to RON, with totals by category and planned versus spent | Know what each trip really cost |

## Functional requirements

Thirteen user stories cover the four features; each lists the conditions that must hold for it to count as done.

### Trips

1. **US-01** As the author, I want to create a trip with a title, start and end dates, a short summary and a cover photo, so that each journey has its own page.
   - The cover photo is uploaded on its own, separately from the trip gallery.
   - The end date cannot be before the start date. A single-day trip (same start and end date) is allowed.
   - A trip cannot overlap the dates of another trip. Dates are inclusive, so a trip cannot start on the day another ends.
   - A trip can be in the past, in progress or planned for the future.
   - A trip can be saved as a draft. Drafts are hidden from visitors until published.
   - The new trip appears in the trip list, newest first by creation date.
2. **US-02** As the author, I want to edit or delete a trip, so that I can fix mistakes.
   - Deleting asks for confirmation first.
   - Deleting a trip also removes its places, journal entries, photos and expenses.
3. **US-03** As a visitor, I want to browse a list of published trips, so that I can choose one to read.
   - Each trip card shows its cover photo, title, dates and countries visited.
   - Countries visited are taken from the trip's places. A trip without places shows none.

### Interactive map

A place is one city-level stop on a trip, for example "Rome, Italy, 12 May".

4. **US-04** As the author, I want to add a place to a trip by clicking its location on the map, so that I don't need to know coordinates.
   - The city name and country are filled in automatically from the clicked location. The author can edit the name.
   - A place has a name, a country and a date visited within the trip dates.
   - The author sets the order of the places in the trip's route.
5. **US-05** As a visitor, I want to see a world map of all visited places, so that I can explore the travels at a glance.
   - Only places from published trips with a visit date of today or earlier are shown. Planned places are not.
   - A city visited on several trips has a single pin.
   - Visited countries are highlighted.
   - Clicking a pin shows the place name and every trip that visited it, with dates and links to each trip.
6. **US-06** As a visitor, I want to see a trip's route on its own map, so that I can follow the journey.
   - Places are connected by straight lines in the order set by the author.
   - A trip with a single place shows only its pin.

### Journal and photos

7. **US-07** As the author, I want to write a journal entry for a day of a trip, optionally linked to a place, so that I can record what happened.
   - An entry has a date, a title and text written in Markdown (headings, bold, lists).
   - A live preview shows the formatted text while writing.
   - A day can have several entries.
8. **US-08** As the author, I want to upload several photos at once with captions to the trip's gallery, optionally attached to a journal entry, so that the story has pictures.
   - Only JPEG files are accepted, up to a size limit still to be agreed.
   - Every photo belongs to a trip and appears in that trip's gallery.
   - Deleting a journal entry also deletes the photos attached to it.
   - Smaller preview images are shown in galleries so pages load quickly.
9. **US-09** As a visitor, I want to read the journal in date order with its photos, so that I can follow the trip like a story.
   - Clicking a photo opens it full screen, with arrows to move between photos.

### Budget calculator

10. **US-10** As the author, I want to set an optional planned budget for a trip, so that I can compare plan and reality.
    - The planned budget is a single total in RON.
    - It can be zero or more.
11. **US-11** As the author, I want to record an expense with date, description, category, amount and currency, so that every cost is captured.
    - Amount must be greater than zero.
    - Category comes from a fixed list (see business rules).
12. **US-12** As the author, I want each expense converted to RON automatically, so that I never calculate it myself.
    - The rate is filled in from the National Bank of Romania, and the author can replace it with the actual rate from the bank statement (BR-02 to BR-05).
    - The original amount, the converted amount and the rate used are all shown.
13. **US-13** As the author, I want a budget summary for each trip, so that I know what the trip cost.
    - Shows total spent, spending by category, and planned versus spent with the difference.
    - Spending over the planned budget is highlighted.
    - All totals are in RON.
    - Only the author can see budgets and expenses.

## Business rules

The key rule is that each expense keeps the rate it was saved with (the National Bank of Romania rate by default, or the actual rate the author typed in), so totals never change on their own.

| ID | Rule |
| --- | --- |
| BR-01 | The home currency for all budget totals is RON (Romanian leu). It cannot be changed. |
| BR-02 | When an expense's date or currency is entered or changed, the National Bank of Romania reference rate for that date is filled in automatically. |
| BR-03 | If no rate is published for that date (weekend, holiday or future date), the most recent earlier rate is used. |
| BR-04 | The author can replace the filled-in rate with the actual rate paid. If the National Bank of Romania publishes no rate for the currency, the author must enter one. |
| BR-05 | The saved rate is used for all totals. It changes only when the author edits it or changes the expense's date or currency (BR-02). Changing the amount recalculates the converted amount at the saved rate. |
| BR-06 | Expenses already in RON are not converted. |
| BR-07 | Converted amounts are rounded to 2 decimal places; totals add up the rounded amounts. |
| BR-08 | Expense categories: Transport, Accommodation, Food and drinks, Activities, Shopping, Other. |
| BR-09 | Places and journal entries must be dated within their trip's start and end dates. |
| BR-10 | Trips cannot overlap, and dates are inclusive: a trip cannot start on the day another ends. A single-day trip is allowed. |
| BR-11 | Deleting a trip deletes everything that belongs to it. Deleting a journal entry deletes its photos. |
| BR-12 | Places are recorded at city level. The same city visited on several trips shares one pin on the world map. |
| BR-13 | The world map shows only places from published trips with a visit date of today or earlier. |
| BR-14 | Visitors cannot see draft trips, budgets or expenses, and cannot change any content. This is enforced by the backend. |

## Out of scope

Anything not listed in the scope overview is excluded from this release; the items below are candidates for later.

- Multiple authors, visitor sign-up, comments or likes
- A separate mobile app, and phone or tablet layouts (desktop browsers only)
- A visual, Word-style text editor (the journal uses Markdown)
- Photo formats other than JPEG
- Reading location and date automatically from photo files
- Importing GPS tracks from hikes or bike rides
- Searching for places near a location, or distance travelled per trip
- Showing planned trips on the world map
- Linking expenses to places
- Changing the home currency
- Achievements and badges
- Connections to banks or booking sites
- More than one language

## Demo plan

The demo is a 20-minute online screen share that shows the product working end to end, then the code behind it.

- The site runs on the owner's laptop with Docker, with invented sample trips pre-loaded.
- The author is signed in in one browser window, with a private window beside it as a visitor. A change made as the author is refreshed in the visitor window to show what visitors cannot see.
- The automated test proving that a visitor cannot change content through the API is shown next.
- Interviewers will review the code, tests and Git history, so these are part of the demo.

## Assumptions, risks and open questions

The biggest risk is the one-week timeline, so scope is fixed now, a cut order is agreed, and the last day is kept as a buffer.

**Assumptions**

- One author; no other accounts are needed.
- Exchange rates come from the National Bank of Romania's free daily reference rates.
- City names and countries come from a free online map lookup service, such as OpenStreetMap.
- Internet is available during the demo, since it is an online interview; the map, place lookup and exchange rates need it.

**Risks**

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Work takes longer than one week | Incomplete demo | Fixed scope, agreed cut order (see Priorities), Day 7 kept free |
| Exchange-rate service unavailable during the demo | Budget conversion fails | Rates saved once fetched; author can type the rate (BR-04) |
| Place lookup service unavailable during the demo | New places can't be named automatically | Author types the city name and country |
| Live demo breaks or the connection drops | Poor impression | Sample trips pre-loaded, demo rehearsed, screenshots as backup |

**Answered questions**

- [x] The interview is on 22 October, so the deadline holds.
- [x] Photos are JPEGs of at most 10 MB, and a trip has at most 10 photos (#26).
- [x] An expense can be dated before the trip starts only while the trip is a draft (#27).
- [x] A trip cannot start on the same day another trip ends (#28).

## Timeline and milestones

The product should be feature-complete by the end of Day 6, leaving Day 7 for demo preparation and fixes.


Business rules are checked by automated tests before the screens are built, so problems surface early rather than during the demo.

## Next steps for the business analyst

Feedback is needed by the end of Day 1 so that building is not held up.

- [x] Review the scope and out-of-scope lists and confirm nothing essential is missing.
- [x] Refine the user stories and acceptance criteria where they are unclear or untestable.
- [x] Resolve the four remaining open questions with the owner.
- [ ] Draft a 20-minute demo script: which sample trip to show, in what order, what to say about each feature, and when to switch to the code and tests.
- [ ] Prepare invented content for two or three sample trips: places, Markdown journal text, JPEG photos and expenses in at least two currencies, with a planned budget on at least one trip and one future trip to show it stays off the world map.
