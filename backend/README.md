# Nameplate API — `backend/`

The Nameplate API: NestJS (Node 22, TypeScript) + Prisma ORM on PostgreSQL 16,
described as a REST/JSON service. See **`../docs/architecture.md`** for the
full stack decision (§2), API conventions and endpoint map (§3), and the
offline sync design (§4). Entity shapes come from **`../docs/data-model.md`**.

The backend now has the complete designed V0 database foundation: 28 Prisma
models, forward-only PostgreSQL/Supabase migrations, deterministic pilot-scale
seed data, Supabase JWT verification, active membership context, permission
and property-scope guards, tenant RLS, Auth user synchronization, and a private
media bucket policy. Business workflows beyond the existing asset/service/sync
slice remain roadmap work; a modeled table is not the same as a completed API.

Deployment and recovery steps live in
[`../docs/supabase-backend-runbook.md`](../docs/supabase-backend-runbook.md).

## What's here

```
backend/
├── prisma/
│   ├── schema.prisma       28 V0 models across identity, registry, custody,
│   │                        work, parts, turns, sync, audit, media, and metrics
│   └── migrations/         Core + forward-only foundation migration
├── src/
│   ├── main.ts              Nest bootstrap, global ValidationPipe, CORS
│   ├── app.module.ts        Wires every module below
│   ├── prisma/              PrismaService/PrismaModule (global provider)
│   ├── auth/                Supabase JWT, membership, RBAC, scope, tenant tx
│   ├── config/              Validated runtime environment contract
│   └── modules/
│       ├── org/             GET /v1/org (no orgId = the demo org), GET /v1/org/all
│       ├── properties/      GET list/:id + buildings sub-resource, POST/PATCH (stub CRUD)
│       ├── buildings/       GET list/:id + units sub-resource, POST (stub CRUD)
│       ├── units/           GET list/:id (assets + open WOs), POST (stub CRUD)
│       ├── assets/          FULL CRUD + lookup; atomic custody move API is wired
│       ├── asset-models/    GET list + /categories, POST (stub CRUD + simple search)
│       ├── service-events/  FULL: CRUD, POST creates event + part usages atomically
│       ├── parts/           /v1/parts + /v1/parts/:id/lineage (stub, single-hop)
│       ├── work-orders/     GET list/:id, POST/PATCH, assign/close (stub CRUD)
│       └── users/           Me + maintenance roster, Supabase invite, access configuration
└── .env                     DATABASE_URL — not committed in a real repo; here for scaffold convenience
```

The assets and service-events modules are the original built-out slices. The
users module now adds organization roster reads, server-side Supabase Auth
invitations, role/rate configuration, property assignments, and access
suspension. Other controllers remain partial scaffolds; a wired endpoint is
not evidence that its complete business workflow is finished.

## What's deliberately deferred

The resident identity/occupancy, resident request activity, notification,
`part_movement`, `job_outbox`, `api_key`, `webhook_delivery`, and `export_job`
tables are not modeled yet. Resident schema and API requirements are specified
in [`../docs/resident-portal-backend-plan.md`](../docs/resident-portal-backend-plan.md).
Several modeled V0 areas still need domain services/endpoints—notably custody
history, turns, reconciliation, media upload intents, metrics, and device
revocation. See the blueprint roadmap rather than inferring completion from
the Prisma catalog.

Postgres-only generated columns, partial indexes, checks, extensions, and the
custody exclusion constraint are versioned in the forward migration. Do not
regenerate or replace that SQL with a plain Prisma diff.

## Setup — running the demo locally

Requires Node 22+ and Postgres 14+ reachable locally. On macOS with
Homebrew's `postgresql@14`:

```bash
brew services start postgresql@14     # or: pg_ctl -D /opt/homebrew/var/postgresql@14 start
createdb nameplate_dev                 # one-time
```

```bash
cd backend
npm install

# Copy backend/.env.example to backend/.env and point DATABASE_URL at your
# local DB, e.g.:
#   DATABASE_URL="postgresql://<your-macos-user>@localhost:5432/nameplate_dev?schema=public"
#   PORT=3000
# (Note: no password needed for a default local Homebrew Postgres install
# with peer/trust auth — adjust if yours differs.)

npx prisma migrate deploy              # applies the versioned migration chain
npm run prisma:seed                    # disposable DB only; loads synthetic portfolio
npm run start:dev                      # http://localhost:3000
```

The deterministic seed creates **Sonoran Portfolio Management** with 3
properties, 220 units, 900 assets, 540 service events, 120 work orders, 60
physical parts, 30 turns, and supporting custody, scan, media, sync, audit,
reconciliation, and metric rows. Re-running against a non-empty database is
expected to fail on stable identifiers; use only an empty disposable database.

Other useful scripts (see `package.json`):

```bash
npm run prisma:generate    # regenerate the Prisma client after a schema change
npm run prisma:seed        # re-run prisma/seed.ts directly
npm run prisma:studio      # visual DB browser
npm run build              # nest build
npm run test               # jest unit tests
npm run test:e2e           # jest e2e tests
```

## Trying the live endpoints

```bash
# bootstrap: the demo org (single-tenant demo — no orgId needed)
curl http://localhost:3000/v1/org

ORG_ID=$(curl -s http://localhost:3000/v1/org | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')

curl "http://localhost:3000/v1/properties?orgId=$ORG_ID"
curl "http://localhost:3000/v1/assets?orgId=$ORG_ID"
curl "http://localhost:3000/v1/work-orders?orgId=$ORG_ID"

# the scan endpoint — grab any seeded NPID from the assets list above
curl "http://localhost:3000/v1/assets/lookup?code=<NPID>&orgId=$ORG_ID"

# log a service event with part usages, atomically
curl -X POST http://localhost:3000/v1/service-events \
  -H 'Content-Type: application/json' \
  -d '{"id":"<uuid>","orgId":"<org-uuid>","assetId":"<asset-uuid>","technicianId":"<membership-uuid>","eventType":"repair","occurredAt":"2026-08-26T12:00:00Z"}'
```

CORS is enabled globally (`app.enableCors()` in `main.ts`) so the HQ Vite
dev server (`localhost:5173`) can call this API directly.

## Next steps toward the real V0 (see `docs/v0-scope.md` §1.3, §4)

1. Harden the existing Supabase JWT, RBAC, property-scope, and tenant-RLS layer with the full role × endpoint integration matrix (`architecture.md` §5).
2. Harden the implemented `asset_location` custody transaction with database-backed concurrency and end-to-end tests.
3. Persist sync idempotency receipts and expand the existing pull/push slice to the complete working-set and tombstone contract (`architecture.md` §4).
4. Turns, media presigned uploads, reports (hand-written SQL on the read replica), and broader audit coverage.
5. Add resident profile/occupancy/invitation tables, resident-scoped auth guard,
   safe work-order/activity DTOs, media intents, and notification outbox per
   `resident-portal-backend-plan.md`.
6. OpenAPI 3.1 spec (`backend/packages/contracts` in the target repo layout) generated from/verified against these DTOs, per `architecture.md` §6.
