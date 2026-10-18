# 4. Shared cities and trip places

Date: 2026-10-18 · Status: accepted

## Context

Places are recorded at city level, and a city visited on several trips must have a single pin on the world map that lists every trip (BR-12, US-05). Each trip also needs its own ordered route with a visit date per stop (US-04, US-06).

## Decision

Split the concept in two models:

- **City:** name, country code, country name and coordinates, unique per name and country. It is created the first time a location is added and reused afterwards.
- **Place:** a stop on one trip, linking a trip to a city with a visit date and a position in the route.

The world map queries cities that have at least one place on a published trip with a visit date of today or earlier (BR-13), and groups the trips per city.

## Consequences

- One pin per city falls out of the data model instead of being merged in the frontend.
- If the author renames a city, the rename applies to every trip that visited it. This matches the idea that a city is one real location.
- Matching uses name plus country, so two different cities with the same name in one country would merge. This is accepted for a personal travel log.
- Deleting a trip removes its places but keeps cities, since other trips may still use them.
