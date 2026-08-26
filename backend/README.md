# Nameplate API — `backend/`

The Nameplate API: NestJS (Node 22, TypeScript) + Prisma ORM on PostgreSQL 16,
described as a REST/JSON service. See **`../docs/architecture.md`** for the
full stack decision (§2), API conventions and endpoint map (§3), and the
offline sync design (§4). Entity shapes come from **`../docs/data-model.md`**.

This is a **V0 scaffold** — lean on purpose. It stands up the project
structure, the Prisma schema for the core entities, and working CRUD +
scan-lookup endpoints for Assets and Service Events. Everything else
(auth/RBAC, sync, media, reports, the custody ledger, turns) is either a
thin stub controller or explicitly deferred — see the bottom of
`prisma/schema.prisma` and inline comments in each module.

## What's here

```
backend/
├── prisma/
│   └── schema.prisma       Organization, User, Membership, PropertyAssignment,
│                            Property, Building, Unit, AssetCategory, AssetModel,
│                            Asset, ServiceEvent, WorkOrder, PartCatalog, Part,
│                            PartUsage — see file header for what's deferred.
├── src/
│   ├── main.ts              Nest bootstrap, global ValidationPipe, CORS
│   ├── app.module.ts        Wires every module below
│   ├── prisma/              PrismaService/PrismaModule (global provider)
│   └── modules/
│       ├── org/             GET /v1/org (stub)
│       ├── properties/      /v1/properties CRUD + buildings sub-resource (stub CRUD)
│       ├── buildings/       /v1/buildings + units sub-resource (stub CRUD)
│       ├── units/           /v1/units, unit detail w/ assets + open WOs (stub)
│       ├── assets/          FULL: CRUD + GET /v1/assets/lookup (the scan endpoint)
│       ├── asset-models/    /v1/asset-models catalog (stub CRUD + simple search)
│       ├── service-events/  FULL: CRUD, POST creates event + part usages atomically
│       ├── parts/           /v1/parts + /v1/parts/:id/lineage (stub, single-hop)
│       ├── work-orders/     /v1/work-orders CRUD + assign/close (stub)
│       └── users/           GET /v1/me (stub)
└── .env                     DATABASE_URL — not committed in a real repo; here for scaffold convenience
```

The `assets` and `service-events` modules are the two built out per the
scaffolding brief. Everything else is a real, wired-up NestJS module with
a working Prisma-backed controller, but without DTOs/validation, auth
guards, or business-rule enforcement — treat those as the next slice of
work, not as done.

## What's deliberately NOT modeled yet

Per `docs/data-model.md` §2, §6, §7, the following V0-scope tables are
**not** in `schema.prisma` yet: `storage_location`, `asset_location` (the
append-only custody ledger — the anti-shrinkage feature), `asset_identifier_scan`,
`turn`/`turn_item`, `vendor`, `reconciliation_flag`, `audit_log`, `sync_op`,
`metric_snapshot`, `media`/`media_attachment`, `device`. The scaffold brief
named a specific core set to model (Organization, Property, Building, Unit,
AssetCategory, Asset, ServiceEvent, Part, WorkOrder, User-with-roles); add
the rest as their corresponding modules get built.

Also note: Postgres `GENERATED ALWAYS AS ... STORED` columns (`serial_normalized`,
`labor_cost`, `total_cost` on `service_event` and `part_usage`) are declared
as ordinary nullable columns in `schema.prisma` because Prisma has no native
support for generated columns (`data-model.md` §10). **Before running the
first migration for real, hand-edit the generated SQL migration file** to
add the `GENERATED ALWAYS AS (...) STORED` clauses, the partial unique
indexes (e.g. `asset.serial_normalized` uniqueness scoped to
`serial_confidence IN ('scanned','typed')`), and any `EXCLUDE`/`CHECK`
constraints called out in `data-model.md`. Prisma migrations can express
plain columns/indexes but not these Postgres-specific constructs.

## Setup

Requires Node 22+ and a reachable Postgres 16 instance (local Docker,
Supabase, whatever — see `docs/architecture.md` §7 for the `local` env,
which is Postgres + Redis + MinIO via Docker Compose).

```bash
cd backend
npm install

# Point at your database. A .env with a placeholder is already present;
# replace with a real connection string:
#   DATABASE_URL="postgresql://user:password@localhost:5432/nameplate?schema=public"

npx prisma migrate dev     # creates the nameplate DB schema + generates the client
npm run start:dev          # http://localhost:3000
```

Other useful scripts (see `package.json`):

```bash
npm run prisma:generate    # regenerate the Prisma client after a schema change
npm run prisma:studio      # visual DB browser
npm run build              # nest build
npm run test               # jest unit tests
npm run test:e2e           # jest e2e tests
```

## Trying the scaffolded endpoints

Once running against a migrated database, seed an `Organization`,
`AssetCategory`, etc. via `prisma studio` or a quick script, then:

```bash
# create an asset (NPID + id are client-supplied, per asset-tagging-strategy.md)
curl -X POST http://localhost:3000/v1/assets \
  -H 'Content-Type: application/json' \
  -d '{"id":"<uuid>","orgId":"<org-uuid>","npid":"NP-7K2M4QX9","categoryId":"<category-uuid>"}'

# the scan endpoint
curl 'http://localhost:3000/v1/assets/lookup?code=NP-7K2M4QX9&orgId=<org-uuid>'

# log a service event with part usages, atomically
curl -X POST http://localhost:3000/v1/service-events \
  -H 'Content-Type: application/json' \
  -d '{"id":"<uuid>","orgId":"<org-uuid>","assetId":"<asset-uuid>","technicianId":"<membership-uuid>","eventType":"repair","occurredAt":"2026-08-26T12:00:00Z"}'
```

## Next steps toward the real V0 (see `docs/v0-scope.md` §1.3, §4)

1. Supabase Auth (JWT) integration + RBAC guards + property-scope checks (`architecture.md` §5).
2. `asset_location` custody ledger + the `POST /v1/assets/:id/move` endpoint (currently stubbed to throw).
3. `/v1/sync/pull` + `/v1/sync/push` engine with idempotency (`architecture.md` §4).
4. Turns, media presigned uploads, reports (hand-written SQL on the read replica), audit log.
5. OpenAPI 3.1 spec (`backend/packages/contracts` in the target repo layout) generated from/verified against these DTOs, per `architecture.md` §6.
