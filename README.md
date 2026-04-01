# GB OrderFlow

Enterprise-grade dealer ordering and Head Office approval workflow for Goel Brothers.

## System Design Document

For the full business, UX, architecture, API, ERP, and delivery proposal, see [docs/README.md](./docs/README.md).

## Stack

- React 18 + TypeScript + Vite
- React Router DOM
- React Query
- Axios
- React Hook Form + Zod
- MUI
- Express 5 + TypeScript
- Prisma ORM + PostgreSQL
- Pino logging
- Vitest + Supertest

## Production upgrades in this version

- Refresh token + access token authentication with HTTP-only cookies
- Role-based access control for Dealer and Head Office flows
- Session tracking in PostgreSQL, logout-all-sessions support, and refresh-token rotation
- Login brute-force protection, temporary account lockout, audit logs, and bcrypt password hashing
- Admin-managed password provisioning and credential lifecycle
- Modular backend with controllers, services, repositories, centralized errors, and request validation
- PostgreSQL schema for dealers, users, sessions, SKUs, orders, order items, exports, and audit logs
- Deterministic ERP-safe CSV generation with export history and signed download URLs
- Request tracing, readiness probes, graceful shutdown, idempotent order submission, and race-safe approval/export flows
- React Query caching, route lazy loading, virtualized SKU rendering, mobile-safe pagination, and responsive admin screens
- CI workflow, Docker support, Prisma migrations, and deployment config for Vercel + Railway

## Local development

1. Install dependencies

```bash
npm install --legacy-peer-deps --cache /tmp/gb-orderflow-npm-cache
```

2. Copy environment variables

```bash
cp .env.example .env
```

3. Start PostgreSQL locally, then run migrations and seed data

```bash
docker compose up -d postgres
npm run db:migrate
npm run db:seed
```

If port `5432` is busy on your machine, set `POSTGRES_PORT` and keep `DATABASE_URL` aligned with that port.

4. Start the app

```bash
npm run dev
```

Frontend: `http://127.0.0.1:5173`

API: `http://127.0.0.1:4000`

If port `4000` is already in use, set `PORT` in `.env` to another value and keep `API_ORIGIN` in sync. The Vite dev proxy now follows `API_ORIGIN`, and `HOST` defaults to `127.0.0.1` in development.

Operational endpoints:

- `GET /health` and `GET /api/health` for liveness
- `GET /ready` and `GET /api/ready` for readiness

## Production build

```bash
npm run build
npm run start
```

The production server serves the compiled API from `dist-server/` and, when present, the Vite frontend build from `dist/`.

## Demo credentials

Head Office:

- Username: `admin`
- Password: `GB@2026!`

Dealers:

- Dealer code: `GB-D001`
- Dealer code: `GB-D014`
- Dealer code: `GB-D032`
- Password for active dealers: `dealer123`

## Key scripts

- `npm run dev` - frontend + backend development
- `npm run typecheck` - frontend and backend TypeScript validation
- `npm run lint` - ESLint
- `npm run test` - unit and integration tests
- `npm run build` - full production build
- `npm run db:migrate` - apply Prisma migrations
- `npm run db:seed` - seed database data
- `npm run stress:orders` - bulk dealer order stress runner against a live API
- `npm run backup:db` - PostgreSQL backup wrapper using `pg_dump`

## Auth notes

- `POST /api/v1/auth/logout-all` revokes every active session for the signed-in user.
- Password changes are managed by admin users from the controlled back-office workflow.
- Repeated failed login attempts trigger a temporary account lock based on `.env` settings.

## Deployment

### Frontend on Vercel

- `vercel.json` builds the Vite client from `dist/`
- Set `VITE_API_BASE_URL` to your backend origin, for example `https://gb-orderflow-api.up.railway.app/api`

### Backend on Railway

- `railway.json` starts the Express API from `dist-server/server/index.js`
- Required environment variables are listed in `.env.example`
- Set `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none` when frontend and backend are on different domains
- Set `API_ORIGIN` to the backend public origin so signed CSV download links are correct

## Docker

- `Dockerfile` builds the combined full-stack app
- `Dockerfile.backend` builds the API service only
- `Dockerfile.frontend` builds the static frontend only
- `docker-compose.yml` brings up Postgres, API, and frontend locally

## Notes

- The CSV format is deterministic, UTF-8 BOM encoded, CRLF separated, and validated before export.
- Export generation is idempotent per order and stored in `ExportHistory`.
- Export downloads are re-verified against their stored SHA-256 checksum before delivery.
- Every API response includes an `x-request-id` header for tracing across logs and failures.
- Dealer-facing endpoints intentionally never return internal rate or discount values.
