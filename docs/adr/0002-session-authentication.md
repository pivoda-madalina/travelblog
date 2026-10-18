# 2. Session authentication for the single author

Date: 2026-10-18 · Status: accepted

## Context

There is one author who signs in through the site's own sign-in screen; everyone else is an anonymous visitor (requirements, Users and roles). The frontend and API share an origin (ADR 0001).

## Decision

Use Django's built-in session authentication with CSRF protection, exposed through small sign-in, sign-out and current-user endpoints. The author account is created with `createsuperuser` or the seed command. No token or JWT authentication.

## Consequences

- The session cookie is `HttpOnly`, so scripts on the page cannot read it, and there is no token to store or refresh in the browser.
- The frontend must send the CSRF token on every write request; the API client handles this in one place.
- Permissions use Django's standard `request.user`, which keeps the visitor rules (BR-14) simple to express and test.
- A separate mobile app or third-party API client would need token authentication later. Both are out of scope.
