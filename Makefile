# Short commands for the Docker Compose environment (ADR 0001).

COMPOSE = docker compose
BACKEND = $(COMPOSE) run --rm backend
FRONTEND = $(COMPOSE) run --rm --no-deps frontend

.PHONY: up down logs test lint seed createsuperuser

# Build and start everything, then serve the site on http://localhost:5173.
up:
	$(COMPOSE) up --build --detach --renew-anon-volumes --wait
	@echo Travel Blog is running at http://localhost:5173

# Stop everything. The database and uploaded photos are kept in their volumes.
down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs --follow

test:
	$(BACKEND) pytest
	$(FRONTEND) npm test

lint:
	$(COMPOSE) run --rm --no-deps backend sh -c "ruff check . && ruff format --check ."
	$(FRONTEND) sh -c "npm run lint && npm run typecheck && npm run format:check"

# Load the sample trips. The seed command arrives with #22.
seed:
	$(BACKEND) python manage.py seed

createsuperuser:
	$(BACKEND) python manage.py createsuperuser
