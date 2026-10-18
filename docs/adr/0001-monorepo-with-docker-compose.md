# 1. One repository, run with Docker Compose

Date: 2026-10-18 · Status: accepted

## Context

The backend (Django) and frontend (React) are built, tested and demonstrated by one person in one week. Interviewers must be able to set up and run the whole product by following written instructions, and the demo runs from a laptop.

## Decision

Keep the backend, frontend and documentation in one repository. Docker Compose starts three services: PostgreSQL, the Django API and the Vite development server. The Vite server proxies `/api/` and `/media/` to Django, so the browser sees a single origin. A Makefile wraps the common commands (`make up`, `make test`, `make lint`, `make seed`).

## Consequences

- One clone and one command give a reviewer a working product.
- A change that touches both API and screens is one pull request with one CI run.
- The setup is for development and demo, not production. A production build (static frontend behind a web server, Gunicorn) is out of scope.
