# Event-Driven IT Helpdesk & Incident Management System

A containerized, event-driven IT Helpdesk & Incident Management web application built with a 5-container Docker Compose architecture, strict Category-Based Access Control (CBAC), and asynchronous RabbitMQ topic routing to category-specific Discord webhooks.

## Architecture Overview

| Container | Technology Stack | Exposed Ports | Role |
| :--- | :--- | :--- | :--- |
| `frontend-spa` | React 18, Vite, TypeScript, Bootstrap 5, TanStack Query, Chart.js, Nginx | `5173 -> 80` | Serves the 6-view SPA and proxies `/api/*` requests to `backend-api` |
| `backend-api` | Node.js 20, Express, TypeScript, Prisma ORM, JWT, `bcrypt`, Zod, Swagger | `3000 -> 3000` | Exposes REST endpoints, enforces RBAC/CBAC, queries PostgreSQL, publishes AMQP events |
| `postgres-db` | PostgreSQL 16 (`postgres:16-alpine`) with `pgdata` volume | `5432 -> 5432` | Persistent relational storage for users, categories, certifications, tickets, and comments |
| `rabbitmq-broker` | RabbitMQ 3 (`rabbitmq:3-management-alpine`) with `rabbitmq_data` volume | `5672`, `15672` | Durable topic exchange (`helpdesk_topic_exchange`) routing `ticket.created.<category>` events |
| `notification-worker` | Node.js 20, TypeScript, `amqplib`, Axios, Zod | None | Consumes `notifications_queue` and dispatches Discord webhook embeds by ticket category |

## Prerequisites

- Docker Desktop (with Docker Compose v2)
- Optional for local non-container development: Node.js 20+ and npm

## Quick Start (Docker Compose)

1. Create your local environment file from the template:

   ```bash
   cp .env.example .env
   ```

   Update secrets (`POSTGRES_PASSWORD`, `JWT_SECRET`, `RABBITMQ_DEFAULT_PASS`) as needed. Optionally configure Discord webhook URLs (`DISCORD_WEBHOOK_HW`, `DISCORD_WEBHOOK_SW`, `DISCORD_WEBHOOK_LIC`, `DISCORD_WEBHOOK_NET`). If a webhook URL is left empty, the worker logs and skips delivery gracefully.

2. Build and start all five containers:

   ```bash
   docker compose up -d --build
   ```

   `backend-api` automatically applies Prisma migrations (`npx prisma migrate deploy`) on startup.

3. Seed the database with categories and demo accounts (idempotent):

   ```bash
   docker compose exec backend-api npm run prisma:seed
   ```

## Service URLs

- **Web Application (SPA):** `http://localhost:5173`
- **API Swagger Documentation:** `http://localhost:5173/api/docs` (or `http://localhost:3000/api/docs`)
- **API Health Check:** `http://localhost:5173/api/health`
- **RabbitMQ Management UI:** `http://localhost:15672`

## Seeded Demo Accounts

| Email | Password | Role | Certified Categories |
| :--- | :--- | :--- | :--- |
| `user@helpdesk.local` | `Password123!` | `USER` | None (Standard Reporter) |
| `admin.hw@helpdesk.local` | `Admin123!` | `ADMIN` | `HARDWARE` |
| `admin.lic@helpdesk.local` | `Admin123!` | `ADMIN` | `LICENSES` |
| `admin.sw@helpdesk.local` | `Admin123!` | `ADMIN` | `SOFTWARE`, `NETWORK` |

## Repository Structure

- `backend/` - Express + TypeScript REST API, Prisma schema/migrations, seed script, and Dockerfile
- `worker/` - Standalone RabbitMQ consumer + Discord webhook dispatcher and Dockerfile
- `frontend/` - React 18 + Vite + Bootstrap 5 SPA, Nginx proxy config, and Dockerfile
- `docs/` - Project specification and minimal design documentation
- `e2e/` - Reserved for automated Playwright E2E test suites

## Local Verification Commands

Inside `backend/`, `worker/`, or `frontend/`:

```bash
npm run typecheck
npm run lint
npm run build
```
