# JurisLogic — Headless Tax & Commission Microservice

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-10.x-E0234E?style=flat-square&logo=nestjs&logoColor=white"/>
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white"/>
  <img alt="Redis" src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white"/>
  <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white"/>
  <img alt="Tests" src="https://img.shields.io/badge/tests-30%20passing-4CAF50?style=flat-square&logo=jest"/>
  <img alt="License" src="https://img.shields.io/badge/license-ISC-lightgrey?style=flat-square"/>
</p>

> A standalone, plug-and-play REST microservice for **multi-jurisdiction tax calculation** and **commission computation**. Built to be consumed by any frontend, mobile app, or backend service — no coupling, no lock-in.

---

## Why This Project?

Tax engines are notoriously hard to get right. Float arithmetic loses pennies. Jurisdiction rules stack in non-obvious ways. High-volume batches block request cycles. This project solves all three in a clean, extensible architecture that an employer can read in one sitting and trust in production.

**What it proves:**
- Complex business logic extracted into a reusable, stateless microservice
- True Hexagonal Architecture — swap the database or cache without touching a single business rule
- `decimal.js` throughout — never a floating-point rounding error in financial output
- Real multi-jurisdiction rules: federal → state → county → city stacking for US; per-country standard/reduced rates for EU; HST vs GST+PST branching for Canada
- High-volume batch support via async BullMQ queues — the API acknowledges immediately, workers calculate in parallel

---

## Feature Overview

| Feature | Detail |
|---|---|
| 🌎 **US Sales Tax** | State rates + county/city surcharges (federal → state → local stacking) |
| 🇪🇺 **EU VAT** | Standard & reduced rates for all EU member states, category-driven |
| 🇬🇧 **UK VAT** | Standard (20%), Reduced (5%), Zero-rated — post-Brexit rules |
| 🇨🇦 **Canadian GST/HST/PST** | HST provinces vs GST+PST stacking, per-province configuration |
| 💼 **Commission Models** | Flat-fee, Percentage, and Tiered (progressive bracket) |
| 🧾 **Tax Exemptions** | Certificate-based exemption support, short-circuits the full pipeline |
| ⚡ **Redis Caching** | Jurisdiction rate lookups cached with configurable TTL |
| 📦 **Batch Processing** | POST a payload of N transactions — queued via BullMQ, results async |
| 📋 **Audit Log** | Every calculation recorded to PostgreSQL for compliance |
| 📖 **Swagger UI** | Full OpenAPI docs auto-generated at `/api/docs` |
| 🐳 **Docker-ready** | Multi-stage `Dockerfile` + `docker-compose.yml` (app + PG + Redis) |

---

## Architecture

```
src/
├── domain/                        ← Pure business logic — zero framework dependencies
│   ├── value-objects/
│   │   ├── money.vo.ts            ← Immutable Money (decimal.js, ROUND_HALF_UP)
│   │   ├── tax-rate.vo.ts         ← TaxRate with percentage/decimal factories
│   │   └── jurisdiction-code.vo.ts← Multi-level jurisdiction key (country→state→county→city)
│   ├── entities/
│   │   ├── transaction.entity.ts  ← Aggregate root — enforces state transition rules
│   │   ├── tax-rule.entity.ts     ← Bracketed tax schedule
│   │   └── commission.entity.ts   ← Flat / percentage / tiered commission
│   └── strategies/
│       ├── tax-strategy.interface.ts       ← ITaxStrategy contract
│       ├── tax-strategy.factory.ts         ← Factory: resolves strategy from jurisdiction
│       ├── tax-rule-pipeline.ts            ← Chain of Responsibility pipeline
│       └── implementations/
│           ├── us-sales-tax.strategy.ts    ← US stacked rates
│           ├── eu-vat.strategy.ts          ← EU per-country VAT
│           ├── uk-vat.strategy.ts          ← UK three-tier VAT
│           └── ca-gst.strategy.ts          ← CA HST / GST+PST
│
├── application/                   ← Orchestration — no framework, no DB
│   ├── ports/                     ← Abstraction interfaces (DIP)
│   │   ├── cache.port.ts          ← ICachePort
│   │   ├── queue.port.ts          ← IQueuePort
│   │   ├── audit-log.port.ts      ← IAuditLogPort
│   │   └── tax-rule-repository.port.ts
│   └── use-cases/
│       ├── calculate-tax.use-case.ts
│       ├── calculate-commission.use-case.ts
│       └── process-batch-transaction.use-case.ts
│
├── infrastructure/                ← Concrete adapters — only place framework/DB code lives
│   ├── database/prisma.service.ts
│   ├── adapters/
│   │   ├── redis-cache.adapter.ts
│   │   ├── bullmq-queue.adapter.ts
│   │   └── prisma-audit-log.adapter.ts
│   └── workers/
│       └── batch-tax-processor.consumer.ts
│
└── interfaces/rest/               ← NestJS controllers + DTOs + Swagger decorators
    ├── controllers/
    │   ├── tax.controller.ts
    │   ├── commission.controller.ts
    │   ├── batch.controller.ts
    │   └── health.controller.ts
    └── dto/
        ├── tax.dto.ts
        ├── commission.dto.ts
        └── batch.dto.ts
```

### Design Patterns

| Pattern | Implementation |
|---|---|
| **Strategy** | `ITaxStrategy` → 4 concrete jurisdiction implementations |
| **Factory** | `TaxStrategyFactory` resolves strategy by `JurisdictionRegion` enum |
| **Chain of Responsibility** | `TaxRulePipeline` chains `ExemptionHandler`, `SurchargeHandler`, `MinimumTaxHandler` |
| **Decorator** | Pipeline handlers wrap and augment the base calculation result |
| **Builder** | Fluent `.addHandler()` API on `TaxRulePipeline` |
| **Value Object** | `Money`, `TaxRate`, `JurisdictionCode` — immutable, structurally equated |
| **Repository** | `ITaxRuleRepository` / `ICommissionRepository` port interfaces |
| **Ports & Adapters** | Application depends on abstract ports; infrastructure wires concrete adapters |

---

## API Reference

### `POST /api/v1/tax/calculate`

Calculate tax for a single transaction.

**Request**
```json
{
  "subtotal": 1000.00,
  "currency": "USD",
  "jurisdictionCode": {
    "country": "US",
    "region": "US",
    "state": "CA",
    "county": "LOS_ANGELES"
  },
  "productCategory": "electronics",
  "isExempt": false
}
```

**Response `200 OK`**
```json
{
  "transactionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "subtotal":    { "amount": "1000.00", "currency": "USD" },
  "taxAmount":   { "amount": "95.00",   "currency": "USD" },
  "total":       { "amount": "1095.00", "currency": "USD" },
  "effectiveRate": "9.50%",
  "jurisdiction": "US:CA:LOS_ANGELES",
  "breakdown": [
    { "ruleName": "California State Sales Tax", "ratePercent": "7.25", "amount": { "amount": "72.50", "currency": "USD" } },
    { "ruleName": "Los Angeles County Surcharge", "ratePercent": "2.25", "amount": { "amount": "22.50", "currency": "USD" } }
  ],
  "calculatedAt": "2026-02-21T18:03:43.000Z"
}
```

---

### `POST /api/v1/commission/calculate`

Calculate commission using flat, percentage, or tiered models.

**Request (tiered)**
```json
{
  "transactionAmount": 25000,
  "currency": "USD",
  "jurisdictionCode": { "country": "US", "region": "US" },
  "commissionType": "TIERED",
  "tiers": [
    { "minAmount": 0,     "maxAmount": 10000, "ratePercent": 5 },
    { "minAmount": 10000, "maxAmount": 50000, "ratePercent": 7 },
    { "minAmount": 50000, "maxAmount": null,  "ratePercent": 10 }
  ]
}
```

**Response `200 OK`**
```json
{
  "transactionAmount":  { "amount": "25000.00", "currency": "USD" },
  "commissionAmount":   { "amount": "1550.00",  "currency": "USD" },
  "commissionType": "TIERED",
  "effectiveRate": "6.20%",
  "jurisdiction": "US",
  "calculatedAt": "2026-02-21T18:03:43.000Z"
}
```

---

### `POST /api/v1/batch` → `202 Accepted`

Submit up to N transactions for async processing. Returns immediately.

```json
{
  "items": [
    { "referenceId": "order-001", "taxInput": { ... } },
    { "referenceId": "order-002", "taxInput": { ... } }
  ],
  "callbackUrl": "https://yourapp.com/webhook/batch-done"
}
```

```json
{
  "batchId": "batch_1708500000_abc1234",
  "itemCount": 2,
  "status": "QUEUED",
  "message": "Batch batch_... with 2 items has been queued for processing."
}
```

---

### `GET /health`

Kubernetes/load-balancer liveness probe.

```json
{ "status": "ok" }
```

---

## Quick Start

### Option A — Docker (recommended)

```bash
# 1. Clone and enter
git clone https://github.com/ionutn0301/juris-logic.git
cd juris-logic

# 2. Copy environment config
cp .env.example .env

# 3. Start PostgreSQL + Redis
make docker-up

# 4. Run database migrations
npm run prisma:migrate

# 5. Start the API
npm run start:dev
```

The API is now live at **`http://localhost:3000`**  
Interactive docs at **`http://localhost:3000/api/docs`**

---

### Option B — Manual

**Prerequisites:** Node.js ≥ 20, PostgreSQL 16, Redis 7

```bash
git clone https://github.com/ionutn0301/juris-logic.git
cd juris-logic
npm install
cp .env.example .env          # set DATABASE_URL and REDIS_HOST
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

---

## Running Tests

```bash
# Unit tests (30 tests)
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# End-to-end tests
npm run test:e2e
```

Tests cover `Money` arithmetic precision, all 4 jurisdiction strategies, the `TaxRulePipeline` chain, and HTTP contract tests via Supertest.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `CACHE_TTL_SECONDS` | `3600` | Tax rate cache TTL |
| `LOG_LEVEL` | `debug` | Pino log level (`debug`, `info`, `warn`, `error`) |
| `NODE_ENV` | `development` | `production` disables pretty-print logging |

---

## Makefile Commands

```bash
make dev            # Start in watch mode
make build          # Compile to dist/
make test           # Run unit tests
make test-cov       # Run tests with coverage
make lint           # ESLint with auto-fix
make format         # Prettier format
make docker-up      # Start PostgreSQL + Redis containers
make docker-down    # Stop containers
make prisma-migrate # Run DB migrations
make prisma-seed    # Seed the database
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Language | TypeScript 5 (strict mode) |
| Framework | NestJS 10 |
| ORM | Prisma 6 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 + ioredis |
| Queue | BullMQ + @nestjs/bull |
| Decimal Math | decimal.js |
| Validation | class-validator + class-transformer |
| API Docs | @nestjs/swagger (OpenAPI 3) |
| Logging | nestjs-pino (structured JSON) |
| Testing | Jest + Supertest |
| Containers | Docker + Docker Compose |

---

## SOLID Principles in Practice

- **S**ingle Responsibility — one class per concern: `USSalesTaxStrategy` only knows US rules; `TaxRulePipeline` only chains handlers; `CalculateTaxUseCase` only orchestrates.
- **O**pen/Closed — add a new jurisdiction by registering a new `ITaxStrategy` implementation; zero existing code changes required.
- **L**iskov Substitution — all strategies are fully substitutable through `ITaxStrategy`; the factory and pipeline never need to know the concrete type.
- **I**nterface Segregation — four small, focused port interfaces (`ICachePort`, `IQueuePort`, `IAuditLogPort`, `ITaxRuleRepository`) instead of one god interface.
- **D**ependency Inversion — the application layer depends entirely on abstract port interfaces; `InfrastructureModule` is the single composition root that wires concrete adapters.

---

## License

ISC © [Ionut-Alexandru Necula](https://github.com/ionutn0301)
