.PHONY: dev build start test lint format docker-up docker-down prisma-generate prisma-migrate

# ─── Development ──────────────────────────────────────────────
dev:
	npm run start:dev

build:
	npm run build

start:
	npm run start:prod

# ─── Testing ──────────────────────────────────────────────────
test:
	npm test

test-watch:
	npm run test:watch

test-cov:
	npm run test:cov

test-e2e:
	npm run test:e2e

# ─── Code Quality ────────────────────────────────────────────
lint:
	npm run lint

format:
	npm run format

# ─── Database ────────────────────────────────────────────────
prisma-generate:
	npm run prisma:generate

prisma-migrate:
	npm run prisma:migrate

prisma-seed:
	npm run prisma:seed

# ─── Docker ──────────────────────────────────────────────────
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-build:
	docker compose build --no-cache

docker-logs:
	docker compose logs -f app
