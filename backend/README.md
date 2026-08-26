# Nameplate API — `backend/`

The Nameplate API: NestJS (Node 22, TypeScript) + Prisma ORM on PostgreSQL 16,
described as a REST/JSON service. See **`../docs/architecture.md`** for the
full stack decision (§2), API conventions and endpoint map (§3), and the
offline sync design (§4). Entity shapes come from **`../docs/data-model.md`**.

This started as a **V0 scaffold** and is now a **runnable local demo**:
migrated Postgres schema, a realistic seeded portfolio (org, properties,
buildings, units, assets, service events with parts lineage, work orders),
and GET endpoints wired to Prisma across every module so the HQ console
renders real data end to end. Auth/RBAC, sync, media, reports, the custody
ledger, and turns are still either a thin stub controller or explicitly
deferred — see the bottom of `prisma/schema.prisma` and inline comments in
each module.

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
│       ├── org/             GET /v1/org (no orgId = the demo org), GET /v1/org/all
│       ├── properties/      GET list/:id + buildings sub-resource, POST/PATCH (stub CRUD)
│       ├── buildings/       GET list/:id + units sub-resource, POST (stub CRUD)
│       ├── units/           GET list/:id (assets + open WOs), POST (stub CRUD)
│       ├── assets/          FULL: CRUD + GET /v1/assets/lookup (the scan endpoint)
│       ├── asset-models/    GET list + /categories, POST (stub CRUD + simple search)
│       ├── service-events/  FULL: CRUD, POST creates event + part usages atomically
│       ├── parts/           /v1/parts + /v1/parts/:id/lineage (stub, single-hop)
│       ├── work-orders/     GET list/:id, POST/PATCH, assign/close (stub CRUD)
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

npx prisma migrate dev --name init     # creates the schema
npx prisma db seed                     # loads the demo portfolio (see prisma/seed.ts)
npm run start:dev                      # http://localhost:3000
```

The seed script (`prisma/seed.ts`, wired via the `prisma.seed` entry in
`package.json`) creates one demo org — **Sonoran Portfolio Management** —
with 4 properties, ~6 buildings, ~22 units, ~22 assets across realistic
categories (washers, dryers, ranges, refrigerators, dishwashers, water
heaters, HVAC air handlers, microwaves) in a mix of statuses (active,
needs_repair, in_repair, unaccounted_for, retired), several service events
including a cross-asset **parts lineage** example (a control board
salvaged from one failed refrigerator and installed in another), and 4
work orders in different states (open, in_progress, awaiting_parts,
completed). Re-running the seed against a non-empty DB will fail on
unique constraints — reset with `npx prisma migrate reset` first if you
need a clean slate.

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

1. Supabase Auth (JWT) integration + RBAC guards + property-scope checks (`architecture.md` §5).
2. `asset_location` custody ledger + the `POST /v1/assets/:id/move` endpoint (currently stubbed to throw).
3. `/v1/sync/pull` + `/v1/sync/push` engine with idempotency (`architecture.md` §4).
4. Turns, media presigned uploads, reports (hand-written SQL on the read replica), audit log.
5. OpenAPI 3.1 spec (`backend/packages/contracts` in the target repo layout) generated from/verified against these DTOs, per `architecture.md` §6.
