# Travel Blog

[![CI](https://github.com/pivoda-madalina/travelblog/actions/workflows/ci.yml/badge.svg)](https://github.com/pivoda-madalina/travelblog/actions/workflows/ci.yml)

A personal travel website where one author records trips, shows every visited place on an interactive world map, writes a day-by-day journal with photos, and tracks trip spending across currencies, converted to RON at National Bank of Romania rates.

> **Status:** in development. Setup and run instructions will be added once the project is scaffolded.

## Features

| Feature | What it does |
| --- | --- |
| Trips | Title, dates, summary and cover photo; saved as draft or published |
| Interactive map | A pin for every visited city, visited countries highlighted, and each trip's route |
| Journal and photos | Day-by-day entries in Markdown and a photo gallery for each trip |
| Budget calculator | Expenses in any currency converted to RON, with totals by category and planned versus spent |

Visitors can browse published trips, the map, the journal and photos. Only the author can edit content or see budgets and expenses.

## Tech stack

Python, Django and Django REST Framework · React and TypeScript · PostgreSQL · pytest · Docker Compose · GitHub Actions

## Documentation

- [Requirements](docs/requirements.md): scope, user stories and business rules
- [Architecture and engineering guidelines](docs/architecture.md)
- [Architecture decision records](docs/adr/)
- [Working agreements](CONTRIBUTING.md): issues, branches, commits, pull requests and definition of done
