.PHONY: dev test build

dev:
	docker-compose up --build

test-backend:
	cd backend && pytest tests/ -v

lint-frontend:
	cd frontend && npm run lint

migrate:
	cd backend && alembic upgrade head

build:
	docker-compose -f docker-compose.prod.yml build
