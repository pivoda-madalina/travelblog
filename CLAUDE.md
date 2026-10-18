# Travel Blog

Portfolio project for a full-stack developer interview. One author, desktop browsers only, one-week deadline.

## Read first

- `docs/requirements.md`: user stories US-01 to US-13 and business rules BR-01 to BR-14
- `docs/architecture.md`: stack, layout, domain model, conventions, testing strategy
- `docs/adr/`: decisions already made; don't reverse one without a new ADR
- `CONTRIBUTING.md`: workflow, commit format, definition of done

## Working rules

- Every change starts from a GitHub issue and gets its own branch: `<type>/<issue>-<slug>`, for example `feat/8-create-trip`.
- One pull request per issue, body contains `Closes #<n>`. The owner reviews and merges; never merge yourself.
- Commit messages and pull request titles use Conventional Commits.
- Never add AI attribution: no `Co-Authored-By` trailers, no session links, no "Generated with" lines in commits, pull requests or files.
- Commit author: Madalina Pivoda.
- Business rules live in the backend domain layer and each has a test named `test_brXX_...`. Write those tests before the screens that depend on them.
- Money is `Decimal`, never `float`. Tests never call the network.
- Keep scope to the requirements; anything else is out of scope unless the owner says otherwise.

## Commands

To be filled in when the project is scaffolded (#1 to #3): `make up`, `make test`, `make lint`, `make seed`.
