# Working agreements

How work moves from an idea to `main`. The goal is a history a reviewer can read: every change traces back to an issue, and every issue traces back to a requirement.

## Workflow

1. **Start from an issue.** Every change has an issue. User stories reference their ID (US-01 to US-13) and the business rules they touch (BR-01 to BR-14).
2. **Move the issue to In progress** on the project board.
3. **Create a branch from `main`** named `<type>/<issue-number>-<short-description>`, for example `feat/8-create-trip` or `test/14-nbr-rate-fallback`.
4. **Commit in small, focused steps** using the commit message format below. Run `uvx pre-commit install` once per clone, so Ruff, ESLint, Prettier and the whitespace and large-file checks run before every commit.
5. **Open a pull request** as soon as there is something to look at (draft pull requests are fine). Use the template, write `Closes #<issue-number>` and fill in the checklist.
6. **Wait for CI to pass**, then review the diff yourself against the definition of done.
7. **Squash and merge.** The pull request title becomes the commit on `main`, so it must follow the commit message format. Delete the branch afterwards.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/) format: `<type>(<optional scope>): <summary>`

| Type | Use for |
| --- | --- |
| `feat` | A new feature or user-visible behaviour |
| `fix` | A bug fix |
| `test` | Adding or changing tests only |
| `refactor` | Code changes that don't change behaviour |
| `docs` | Documentation only |
| `build` | Dependencies, Docker, tooling |
| `ci` | GitHub Actions |
| `chore` | Anything else (formatting, config) |

Scopes match the feature areas: `trips`, `map`, `journal`, `budget`, `auth`, `infra`.

Examples:

```
feat(budget): convert expenses to RON at the saved rate
test(trips): cover BR-10 overlapping trips
fix(map): show one pin for a city visited on several trips
```

The summary is in the imperative mood, lower case, without a full stop, and at most 72 characters.

## Definition of done

An issue is done when:

- [ ] Every acceptance criterion in the issue is met.
- [ ] Each business rule the change touches has a passing test named after it.
- [ ] Visitor access is tested for any new endpoint (read allowed or refused as specified, writes refused).
- [ ] Lint, type checks and all tests pass locally and in CI.
- [ ] No secrets, debug output or commented-out code is left behind.
- [ ] Documentation is updated if setup, commands or decisions changed. A significant decision gets an ADR.
- [ ] The pull request is merged and the issue is closed.

## Issues, labels and milestones

**Issue types:** user story, task, bug and question, each with its own template.

**Labels:**

| Label | Meaning |
| --- | --- |
| `type: story`, `type: task`, `type: bug`, `type: question` | What kind of issue it is |
| `area: trips`, `area: map`, `area: journal`, `area: budget`, `area: auth`, `area: infra` | Feature area |
| `priority: must` | Required for the demo |
| `cut-candidate` | Can be dropped if time runs short; the cut order is in the requirements |
| `blocked` | Waiting on a decision or another issue |

**Milestones** follow the delivery phases: Foundation, Trips, map and budget, Journal and photos, Demo ready.

**Project board columns:** Backlog → Ready → In progress → In review → Done.

## Architecture decision records

Decisions that would be hard to reverse, or that a reviewer might question, are recorded in `docs/adr/` as short numbered files (`0005-short-title.md`) with three sections: Context, Decision and Consequences. A decision is never edited later; a new record replaces it.
