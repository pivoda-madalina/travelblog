# 3. Freeze the exchange rate on each expense

Date: 2026-10-18 · Status: accepted

## Context

Budget totals are in RON (BR-01). Expenses can be in any currency. The National Bank of Romania publishes one reference rate per currency per banking day, and the author may want to use the actual rate from a bank statement instead (BR-04). Totals must never change on their own (BR-05).

## Decision

Each expense stores its own `rate` (RON per 1 unit), a `rate_source` (`nbr` or `manual`) and the rounded `amount_ron`. Totals are always computed from the stored `amount_ron` values.

- When the date or currency is set or changed, the rate is looked up again (BR-02). If no rate exists for that date, the latest earlier rate is used (BR-03).
- When only the amount changes, `amount_ron` is recalculated with the saved rate (BR-05).
- NBR rates are fetched from the official XML feed, divided by the published multiplier, and cached in an `ExchangeRate` table, so each date is fetched only once.
- RON expenses use a rate of exactly 1 and are not converted (BR-06).

## Consequences

- Historical totals are stable and auditable: the original amount, rate and converted amount are all visible.
- A failed NBR request does not block saving; the author can type the rate (BR-04, and the demo risk mitigation).
- Storing a derived value (`amount_ron`) means it must be recalculated in one place only, on save in the domain layer, and covered by tests.
