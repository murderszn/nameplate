# Nameplate — System Architecture

**Status:** Decided (V0). Read `data-model.md` for schema detail and `v0-scope.md` for what actually ships first.

---

## 1. The four product surfaces

| Surface | Name | Tech | Primary user | Network assumption |
|---|---|---|---|---|
| Mobile | **Nameplate Field** | Flutter (iOS + Android) | Maintenance technician | **Offline-first.** Assume no signal. |
| Web console | **Nameplate HQ** | React + TypeScript + Vite | Remote portfolio manager, property manager | Always online. |
| Resident web portal | **Nameplate Resident** | React + TypeScript + Vite | Current resident / renter | Always online; mobile web first. |
| Marketing site | nameplate.app | Astro (static) | Prospect | Always online. |
| API | Nameplate API | NestJS (TypeScript) on Node 22 | — | — |
| Database | — | **PostgreSQL 16** | — | — |

```
┌───────────────────────────┐                      ┌───────────────────────────┐
│   Nameplate HQ (React)    │                      │  Nameplate Portal (React) │
│  hq.nameplate.app (Vite)  │                      │ portal.nameplate.app(Vite)│
└─────────────┬─────────────┘                      └─────────────┬─────────────┘
              │  REST / JSON (online, per-request)               │  REST / JSON (resident auth,
              │  Portfolio admin, work orders, telemetry         │  tag scan, maintenance tickets)
              │                                                  │
              └─────────────────────┐      ┌─────────────────────┘
                                    ▼      ▼
┌──────────────────────────┐   ┌──────────────────────────────────────┐
│  Nameplate Field         │   │        Nameplate API (NestJS)        │
│  (Flutter, iOS/Android)  │   │  ┌────────────────────────────────┐  │
│                          │   │  │ auth guard / RBAC / org scope  │  │
│  ┌────────────────────┐  │   │  ├────────────────────────────────┤  │
│  │ Drift (SQLite)     │  │   │  │ /v1/*  management endpoints    │  │
│  │  local mirror      │◄─┼───┼──┤ /v1/portal/* resident routes   │  │
│  ├────────────────────┤  │   │  │ /v1/sync/pull  /v1/sync/push   │  │
│  │ outbox (mutations) │──┼──►│  ├────────────────────────────────┤  │
│  │ (UUIDv7, append)   │  │   │  │ domain services (ledger,       │  │
│  ├────────────────────┤  │   │  │  custody, workorder, costing)  │  │
│  │ photo blob queue   │──┼──►│  └───────────────┬────────────────┘  │
│  └────────────────────┘  │   └──────────────────┼───────────────────┘
└──────────────────────────┘                      │ Prisma
        ▲ direct upload                           ▼
        │ (signed URL)                 ┌────────────────────────────┐
        │                              │  PostgreSQL 16 (Supabase)  │
   ┌────┴──────────┐                   │  + read replica (reports)  │
   │ Object storage│                   └────────────────────────────┘
   │  (S3-compat)  │                                │
   └───────────────┘                                ▼
                                       ┌────────────────────────┐
                                       │ Worker (BullMQ + Redis)│
                                       │  metric rollups,       │
                                       │  shrinkage scan, email │
                                       └────────────────────────┘
```

---

## 2. Backend stack decision

### The evaluation

The founder's default was MERN. Four options were considered against the four things this domain actually demands.

**What the domain demands:**

1. **Deeply relational, deeply hierarchical data.** Organization → Property → Building → Unit → Asset → ServiceEvent → PartUsage → Part → (sourced from) Asset. Nearly every valuable question crosses four or more of those joins: *"cost per unit last 12 months by property, excluding assets replaced under warranty."*
2. **Historical integrity is the product.** Chain of custody and repair-vs-replace economics are *the* differentiators. That means append-only ledgers, referential integrity that cannot silently rot, and transactional multi-row writes (a service event + three part usages + an asset status change + a work-order close must all commit or none of them do).
3. **Reporting is a first-class feature, not an afterthought.** Every metric in `metrics.md` is a GROUP BY with date bucketing and window functions.
4. **Offline sync with server-authoritative merge.** Needs a monotonic change cursor and deterministic conflict handling.

**MERN (MongoDB + Express + React + Node) — rejected.**
MongoDB is a genuinely good fit for *some* products; this is not one. The data here is not document-shaped, it is graph-shaped, and the entity that matters most (Part lineage: this control board came out of unit 4B's dead fridge and went into unit 12C's) is a many-to-many edge with history. Modeling that in Mongo forces a choice between embedding (which destroys the ability to query parts independently) and manual references (which is a foreign key with no enforcement). Multi-document transactions exist but are a performance cliff and a footgun. The killer, though, is reporting: every HQ dashboard becomes a hand-written aggregation pipeline, and "give me cost per unit per month across 40 properties" is a page of `$lookup`/`$unwind` that a Postgres user writes in six lines and the query planner optimizes for free. Choosing Mongo here means paying a tax on every analytics feature for the life of the product — and analytics is where this product's pricing power lives. **The "M" is the wrong letter.** The rest of MERN (Node + React) we keep.

**Firebase (Firestore + Functions) — rejected.**
Its offline story is genuinely excellent and would save real work in the Flutter app. But Firestore's query model (no joins, no aggregations beyond count/sum, mandatory composite indexes, no ad-hoc queries) makes the HQ console — a reporting product — extremely painful. You end up maintaining denormalized rollup documents by hand via triggers, which is a correctness nightmare for financial data. Security rules cannot express "a tech may edit a service event they authored within 24 hours unless the work order is closed." Vendor lock-in is near-total. **Rejected.**

**Supabase-only (Postgres + PostgREST + RLS, no custom API) — rejected as the *whole* architecture.**
Right database, wrong amount of it. Pushing all logic into RLS policies and Postgres functions is fast for CRUD and brutal for this domain's invariants: minting NPIDs, closing work orders, writing custody ledger rows, computing costs, and reconciling an offline sync batch are transactional workflows, not row filters. Debugging business rules in PL/pgSQL is a bad place to be at month six. **But Supabase as *managed infrastructure* is excellent** — see below.

**Postgres + Node/TypeScript + Prisma — SELECTED.**

> ## Decision
>
> **PostgreSQL 16 + NestJS (Node 22, TypeScript) + Prisma ORM, REST API. Postgres, Auth, and Object Storage hosted on Supabase for V0. React + TypeScript for HQ and Resident. Flutter + Drift (SQLite) for Field.**

**Justification:**

- **Postgres answers the domain's questions natively.** Recursive CTEs walk the property hierarchy. Window functions compute time-between-services and rolling cost. `GENERATED` columns and partial unique indexes enforce "serial number unique per manufacturer, ignoring nulls." `tstzrange` + exclusion constraints can enforce non-overlapping asset location history. Every one of these is a feature we would otherwise write in application code and get subtly wrong.
- **Integrity by default.** Foreign keys, `CHECK` constraints, and transactions mean the chain of custody cannot develop holes because a Node process crashed mid-write. For a product whose pitch is "you can trust this record," this is not a preference, it is the product.
- **One language end to end (except Flutter).** TypeScript across API and HQ; Prisma generates types from the schema, and we generate the HQ client and the Flutter models from one OpenAPI spec. A schema change breaks the build in three places instead of surfacing as a 3am null in production.
- **NestJS over bare Express** because this app has real structure — guards for RBAC, interceptors for org scoping and audit logging, DI for testable domain services, and `class-validator` DTOs that double as OpenAPI schema. Express would require assembling the same thing by hand, less consistently. (Fastify is used as Nest's HTTP adapter for throughput.)
- **Prisma over raw SQL/Knex** for migrations, type-safe CRUD, and developer speed. Escape hatch: raw SQL via `$queryRaw` for the reporting queries, which are written by hand deliberately — ORMs are bad at analytics and we do not pretend otherwise.
- **Supabase for infra, not for architecture.** We use its managed Postgres (with PITR), its Auth (GoTrue — JWT issuance, password reset, MFA later) and its S3-compatible Storage for photos. We do *not* use PostgREST as the API, and we do *not* rely on RLS as the primary authorization mechanism. This gets us a production-grade V0 without an ops hire, and because it is plain Postgres and plain S3, migrating to RDS/Cloud SQL later is a `pg_dump` and a config change, not a rewrite.
- **RLS is still enabled as defense-in-depth.** Every tenant table gets an `org_id` and an RLS policy keyed to a session GUC (`app.current_org_id`) that the API sets per transaction. Authorization is enforced in the application layer; RLS is the seatbelt that turns a missed `WHERE` clause into zero rows instead of a cross-tenant data leak.

**Explicit costs of this choice we accept:** schema migrations require thought (a feature, not a bug, for financial records), and Postgres offline sync requires us to build the sync endpoint ourselves rather than getting it free from Firestore. Section 4 is that design, and it is roughly two weeks of work — worth it.

**Revisit trigger:** if a single org exceeds ~50M service events or reporting p95 exceeds 3s on the read replica, add ClickHouse or a Postgres columnar extension for analytics. Not before.

---

## 3. API surface

### Style decision: **REST over HTTP/JSON, described by OpenAPI 3.1.**

GraphQL was considered and rejected for V0. Its strengths — flexible client-shaped queries, avoiding over-fetching — solve problems we do not have: we control both clients, the query shapes are known and few, and the offline app wants *coarse, cacheable, batchable* payloads, which is REST's natural shape and GraphQL's awkward one. Against that, GraphQL costs us N+1 mitigation (DataLoader everywhere), harder HTTP caching, harder rate limiting, weaker CDN behavior, and a much more complex authorization story where field-level rules must be enforced per resolver. REST + OpenAPI also gives us **generated Dart clients for Flutter and generated TS clients for HQ from one spec**, which is a large practical win. Revisit if we ever ship a public partner API with unknown consumers.

**Conventions**

- Base: `https://api.nameplate.app/v1`. Version in path; additive changes only within a major.
- `Authorization: Bearer <JWT>`. Org context is derived from the token's active membership, never from a client-supplied header.
- IDs are **UUIDv7** (time-sortable, client-generatable — critical for offline creation).
- All mutating requests accept `Idempotency-Key`; keys are stored for 7 days. Non-negotiable for a client that retries over flaky LTE.
- Cursor pagination: `?limit=&cursor=`. Never offset — data shifts under a paging tech.
- Errors: RFC 9457 `application/problem+json` with a stable `type` slug the Flutter app switches on.
- Timestamps: RFC 3339 UTC. Every record carries both `occurred_at` (when the tech says it happened) and `recorded_at` (server receipt) — they diverge by hours for offline work and conflating them corrupts every metric.

### Endpoint map (V0)

**Auth & identity**
```
POST   /v1/auth/login                    email+password → access(15m)+refresh(60d)
POST   /v1/auth/refresh
POST   /v1/auth/logout
GET    /v1/me                            user, role, org, assigned properties
```
*Field app refresh tokens are long-lived (60d) and device-bound; a tech must not be logged out mid-shift because they were offline for a week.*

**Org & locations**
```
GET    /v1/org
GET    /v1/properties                    ?q= &cursor=
POST   /v1/properties
GET    /v1/properties/:id
PATCH  /v1/properties/:id
GET    /v1/properties/:id/buildings
POST   /v1/buildings
GET    /v1/buildings/:id/units
POST   /v1/units
GET    /v1/units/:id                     includes current assets + open work orders
```

**Assets — the core**
```
GET    /v1/assets                        ?property_id= &status= &category= &q= &cursor=
POST   /v1/assets                        mint NPID; accepts client-generated id
GET    /v1/assets/:id                    full record + current location
GET    /v1/assets/:id/history            unified timeline: services, moves, work orders
GET    /v1/assets/:id/locations          custody ledger (chain of custody)
PATCH  /v1/assets/:id                    attributes only, never location
POST   /v1/assets/:id/move               location change → writes AssetLocation row
POST   /v1/assets/:id/retire             disposal / write-off, with reason
GET    /v1/assets/lookup?code=           **the scan endpoint**: resolves NPID,
                                         manufacturer serial, or legacy tag → asset
GET    /v1/asset-models                  ?manufacturer= &q=  (asset-master catalog)
POST   /v1/asset-models                  crowd-populated; see asset-tagging-strategy.md
```
`POST /v1/assets/:id/move` being a **separate endpoint from PATCH** is deliberate architecture, not REST pedantry: location changes must always append to the immutable custody ledger with actor, timestamp, and reason. Making it impossible to change an asset's location via a generic field update is what makes shrinkage detection trustworthy.

**Service & parts**
```
GET    /v1/service-events                ?asset_id= &technician_id= &from= &to=
POST   /v1/service-events                creates event + part usages atomically
GET    /v1/service-events/:id
PATCH  /v1/service-events/:id            author-editable ≤24h, then admin-only
GET    /v1/parts                          ?source_asset_id= &status=
POST   /v1/parts                          register salvaged/new part into inventory
GET    /v1/parts/:id/lineage              where it came from, where it went
```

**Work orders & turns**
```
GET    /v1/work-orders                   ?status= &assignee= &property_id= &sla=
POST   /v1/work-orders
PATCH  /v1/work-orders/:id               status transitions validated server-side
POST   /v1/work-orders/:id/assign
POST   /v1/work-orders/:id/close
GET    /v1/turns                         ?unit_id= &status=
POST   /v1/turns                         start a turn; server generates checklist
                                         from the unit's current asset roster
PATCH  /v1/turns/:id/items/:itemId       per-asset finding: present/missing/broken
POST   /v1/turns/:id/complete            emits work orders for flagged items
```

**Resident portal** — resident auth and occupancy scope are separate from staff
RBAC. See `resident-portal-backend-plan.md` for the schema, privacy boundary,
status projection, and delivery sequence.
```text
POST   /v1/resident/auth/accept-invitation
GET    /v1/resident/me
GET    /v1/resident/home                 unit + appliances + open requests
GET    /v1/resident/appliances
GET    /v1/resident/appliances/:npid     occupancy-scoped tag resolution
GET    /v1/resident/work-orders
POST   /v1/resident/work-orders          source/unit/property derived server-side
GET    /v1/resident/work-orders/:id
POST   /v1/resident/work-orders/:id/comments
POST   /v1/resident/media/upload-url
POST   /v1/resident/media/:id/attach
GET    /v1/resident/notification-preferences
PATCH  /v1/resident/notification-preferences
```
Resident serializers are allowlists. They never expose internal notes, costs,
SLA calculations, serial numbers, custody history, staff contact data, or
records outside the authenticated resident's active unit occupancy.

**Media**
```
POST   /v1/media/upload-url              → presigned PUT + media_id
POST   /v1/media/:id/attach              bind uploaded blob to an entity
```
Photos never transit the API server. Field uploads a blob directly to object storage via a presigned URL, then attaches by ID — so a 4MB photo failing on a weak connection retries independently of the service-event record, which is a few hundred bytes and must land first.

**Sync (field app only)** — see §4.
```
POST   /v1/sync/pull
POST   /v1/sync/push
```

**Reporting (HQ only)**
```
GET    /v1/reports/portfolio-summary     ?from= &to=
GET    /v1/reports/cost                  ?group_by=property|unit|category|model
GET    /v1/reports/lifespan              ?group_by=manufacturer|model|category
GET    /v1/reports/shrinkage             assets unaccounted for + custody gaps
GET    /v1/reports/work-order-sla
GET    /v1/exports/:dataset.csv          async job → signed download URL
```
Reporting endpoints hit the **read replica** and are cached 60s. They are the only endpoints permitted to use hand-written SQL.

---

## 4. Offline-first sync strategy

The design constraint: a tech works a basement laundry room and three units with no signal for two hours, logs eleven service events and forty photos, then walks into the parking lot and everything must land correctly without a merge dialog. **A technician must never be shown a conflict resolution UI.**

### 4.1 Local store

Flutter uses **Drift** (SQLite) as a full local mirror of the tech's *working set*, not the whole org. The working set is scoped server-side to the properties the user is assigned to, plus every asset, open work order, and the **last 10 service events per asset** within them. For a 400-unit portfolio that's roughly 1,600 assets and ~30MB — comfortable. Older history is fetched on demand and shown as "requires connection."

The app reads **only** from SQLite. The network layer's sole job is to keep SQLite fresh. This means every screen renders instantly and identically online or off, and there is exactly one code path — the most important architectural property of the whole app.

### 4.2 Writes: an append-only outbox

Every mutation is written locally *and* enqueued as an **outbox row**: `{op_id (UUIDv7), entity_type, entity_id, op_type, payload, occurred_at, device_id, attempts, state}`. The UI reflects the change immediately from local state, badged with `--np-offline-500` "pending sync."

A background sync worker drains the outbox in **strict `op_id` order** (UUIDv7 is time-sortable, so ordering is free and matches the tech's real sequence) via `POST /v1/sync/push` in batches of up to 100. The server processes a batch in one transaction per operation, returning per-op `{op_id, status: applied|duplicate|rejected, server_state, error}`. `op_id` doubles as the idempotency key, so a batch that succeeds server-side but fails to return is safely replayed.

### 4.3 Why conflicts are rare by design

Most of this domain is **append-only facts**, not mutable state. A service event that happened at 10:14am in unit 4B happened; nothing on the server can contradict it. So:

- **ServiceEvent, AssetLocation, PartUsage, TurnItem findings, media** → **insert-only**. Two techs both logging events on the same asset is not a conflict, it's two events. This covers ~90% of field writes.
- **Asset attributes, WorkOrder status, Turn status** → mutable, and here we use **last-write-wins per field, keyed on `occurred_at`** (the client's timestamp of the user action), with the server storing per-field `updated_at`. A field is only overwritten if the incoming `occurred_at` is newer than the stored one. Stale field updates are silently dropped and reported in the push response as `duplicate` so the client re-syncs the winning value.
- **Genuinely conflicting state transitions** — the only real case: a work order closed on the server while a tech was offline working it. Server accepts the tech's attached service events (facts are facts), keeps the work order closed, and raises a **`ReconciliationFlag`** for HQ. The tech sees "Work order was already closed by Dana — your work was still recorded." HQ resolves it. **Humans arbitrate; the app never blocks the tech.**

Device clock skew is handled by having the client record `device_clock_offset` (captured from the `Date` header on every successful response) and the server storing both raw and corrected timestamps. A tech's phone being 20 minutes off must not reorder a ledger.

### 4.4 Reads: cursor-based delta pull

`POST /v1/sync/pull` takes `{cursor, scopes[]}` and returns `{changes: {assets: [...], units: [...], ...}, tombstones: [...], cursor, has_more}`.

The cursor is an opaque encoding of a **server-side monotonic sequence** (`bigint` from a single Postgres sequence stamped onto every row's `change_seq` on insert/update), *not* a wall-clock timestamp. Timestamp cursors lose rows to transaction-commit races; a sequence with a "high-water mark below any in-flight transaction" guard does not. Deletes are soft (`deleted_at`) and surface as tombstones so the client can prune.

Sync triggers: app foreground, pull-to-refresh, after every push, on network regain (`connectivity_plus`), and every 15 minutes while foregrounded. Push is attempted immediately on any write, with exponential backoff (2s → 5m cap) and jitter.

### 4.5 Photos

Queued separately with lower priority, uploaded only on **unmetered connections by default** (tech-overridable), compressed to ≤1600px / ~200KB before queueing. A service event is never blocked on its photos; photos attach afterward by `media_id`.

### 4.6 Offline scanning

The scan resolver works fully offline against the local mirror: an NPID scanned in a basement resolves from SQLite. A scan of an asset **outside the local working set** (e.g. a tech finds a washer at a property they aren't assigned to — exactly the shrinkage signal we care about) is queued as an `UnresolvedScan` with location and timestamp, and resolves on reconnect. These are gold for §`metrics.md` shrinkage detection and must not be discarded.

---

## 5. Auth & roles

**Mechanism:** Supabase Auth (GoTrue) issues JWTs; the API validates signature and claims and hydrates a request context of `{user_id, org_id, role, property_scope[]}` from the DB (never trusting client claims beyond identity). Access tokens 15 min for HQ / 8 h for Field; refresh tokens rotate, are device-bound, and are revocable per device from HQ.

**Multi-tenancy:** every tenant row carries `org_id`. A global NestJS interceptor sets `app.current_org_id` on the transaction; RLS enforces it. Users may belong to multiple orgs (contractors serving several portfolios) — a membership table, with the active org selected at login.

### Roles

| Role | Scope | Can |
|---|---|---|
| **`technician`** | Assigned properties only | Scan; view asset history & cost of *parts* (not labor rates); create service events, turns, moves, part usages; upload media; update work orders assigned to them; create assets. Cannot delete anything, cannot see portfolio financials, cannot edit records >24h old, cannot see other techs' performance metrics. |
| **`lead_tech`** | Assigned properties | Everything a technician can, plus: assign work orders within their properties, edit any service event at their properties, approve replace-vs-repair decisions under a configurable dollar threshold, resolve reconciliation flags. |
| **`property_manager`** | One or more properties | Full read on their properties incl. costs; create/assign/close work orders; approve replacements; manage unit roster; invite technicians. Cannot see other properties, cannot change org settings or billing. |
| **`hq_admin`** | Entire org | Everything across all properties: dashboards, all reports, exports, user & role management, asset-model catalog curation, shrinkage review, billing, integrations. The "one person in Arizona." |
| **`owner`** | Entire org | `hq_admin` + billing ownership + org deletion + audit log export. Exactly one per org, transferable. |
| **`viewer`** | Scoped | Read-only. For owners/investors/insurers. No costs unless explicitly granted. |
| **`service_account`** | Scoped, API-key auth | Integrations. V1. |

**Authorization implementation:** a `@RequirePermission('asset:move')` decorator + guard resolving against a static role→permission matrix, *plus* a property-scope check on every resource load. Two independent gates — role and scope — because in this domain the expensive mistake is a tech at Property A seeing or moving assets at Property B.

**Audit:** every write records `actor_user_id`, `actor_role`, `device_id`, `ip`, `occurred_at`, `recorded_at` into an append-only `audit_log`, partitioned monthly, never updatable, never deletable by any application role. Chain of custody is only worth something if the log itself is trustworthy.

**Sensitive-by-design note:** the audit log and shrinkage scoring are about *assets*, not people. Per §Brand Voice, no screen ranks technicians by loss. HQ sees "asset unaccounted for; last confirmed custody event: 2026-03-14, tech Dana R." — a fact, requiring a human conversation.

---

## 6. Repo layout

Monorepo, pnpm workspaces + Turborepo. Flutter lives inside it but builds independently.

```
/
├── docs/                       ← this directory (source of truth for product decisions)
│
├── website/                    ← nameplate.app — marketing site
│   ├── src/pages/              Astro pages: index, product, field, hq, pricing, contact
│   ├── src/components/
│   ├── src/styles/tokens.css   palette from branding.md §6 — single source
│   └── public/
│       Stack: Astro + Tailwind. Static output → Cloudflare Pages.
│       Zero JS by default; the site is content, not an app.
│
├── app/                        ← Nameplate Field — Flutter (iOS + Android)
│   ├── lib/
│   │   ├── main.dart
│   │   ├── core/               di, config, logging, result types
│   │   ├── data/
│   │   │   ├── local/          Drift schema, DAOs, outbox, migrations
│   │   │   ├── remote/         generated OpenAPI client + interceptors
│   │   │   └── repositories/   the ONLY layer the UI talks to; reads local, queues remote
│   │   ├── sync/               sync engine: pull, push, backoff, media queue, conflict rules
│   │   ├── domain/             entities + use cases (mirrors data-model.md)
│   │   └── features/
│   │       ├── scan/           camera, QR/barcode, manual serial entry, offline resolver
│   │       ├── asset/          asset detail, history timeline, move
│   │       ├── service/        log service event, parts used/swapped
│   │       ├── turn/           turnover walkthrough checklist
│   │       ├── workorder/      my queue
│   │       └── settings/       sync status, offline diagnostics
│   ├── test/  integration_test/
│   └── pubspec.yaml
│       Stack: Flutter 3.2x, Riverpod (state), Drift (SQLite), dio + retrofit
│       (generated), mobile_scanner (QR), go_router. Offline-first per §4.
│
├── backend/                    ← Nameplate API + shared packages
│   ├── api/                    NestJS service
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── common/         guards, interceptors (org scope, audit), problem+json filter
│   │   │   ├── auth/
│   │   │   ├── modules/
│   │   │   │   ├── org/  properties/  buildings/  units/
│   │   │   │   ├── assets/         incl. lookup resolver + custody ledger
│   │   │   │   ├── asset-models/   crowd-sourced catalog
│   │   │   │   ├── service-events/
│   │   │   │   ├── parts/          lineage
│   │   │   │   ├── work-orders/  turns/
│   │   │   │   ├── media/
│   │   │   │   ├── sync/           pull/push engine
│   │   │   │   └── reports/        hand-written SQL, read replica
│   │   │   └── domain/         pure business rules, framework-free, unit-tested
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── test/
│   ├── worker/                 BullMQ consumers: rollups, shrinkage scan, exports, email
│   └── packages/
│       ├── contracts/          OpenAPI 3.1 spec — SOURCE OF TRUTH for the API
│       ├── ts-client/          generated TS client (consumed by hq)
│       └── shared/             enums, status machines, cost math shared by api + hq
│
├── hq/                         ← Nameplate HQ — React web console
│   ├── src/
│   │   ├── routes/             dashboard, properties, units, assets, work-orders,
│   │   │                       turns, parts, reports, shrinkage, settings, users
│   │   ├── components/
│   │   ├── lib/api.ts          wraps @nameplate/ts-client
│   │   └── styles/tokens.css   same tokens as website/
│   └── vite.config.ts
│       Stack: React 18 + TS + Vite, TanStack Query + Table, Tailwind,
│       Recharts. → Cloudflare Pages, calls api.nameplate.app.
│
├── portal/                     ← Nameplate Resident — resident web portal
│   ├── src/                    home, request, work-order, appliance, scan flows
│   └── vite.config.ts
│       Stack: React + TS + Vite. → CDN/SPA, calls resident-scoped API routes.
│
├── infra/                      Terraform, Dockerfiles, CI workflows, migration runbooks
├── turbo.json   pnpm-workspace.yaml   package.json
└── README.md
```

**Note on `hq/`:** the brief lists `website/`, `app/`, `backend/`. HQ is a distinct deployable application with a different audience, auth model, and build pipeline from the marketing site — bundling it into `website/` would couple a static content site to an authenticated SPA. **Create `hq/` as a fourth top-level directory.** If a three-folder layout is a hard constraint, the fallback is `website/` containing `website/marketing/` and `website/hq/` as separate workspace packages — but a sibling `hq/` is cleaner and is the recommendation.

**Contract flow:** `backend/packages/contracts/openapi.yaml` is authored alongside the Nest DTOs and verified against them in CI. From it we generate `ts-client` (for HQ and Resident) and the Dart client (into `app/lib/data/remote/`). Resident-safe response DTOs are separate schemas rather than subsets selected by the browser. A breaking API change fails CI across all clients.

---

## 7. Environments, deployment, observability

| Env | Purpose |
|---|---|
| `local` | Docker Compose: Postgres, Redis, MinIO. Seeded with a synthetic 3-property / 220-unit / ~900-asset portfolio. |
| `staging` | Full mirror. Every PR deploys a preview of HQ + Resident + website. TestFlight / Play internal track for Field. |
| `production` | Supabase Postgres (PITR + daily backups, restore drilled quarterly), API on Fly.io or Railway (2+ instances, health-checked), workers separate, Redis managed, Cloudflare in front. |

- **CI:** typecheck, lint, unit + integration tests (Testcontainers Postgres), Prisma migration dry-run, OpenAPI diff check, `flutter test` + `flutter analyze`.
- **Migrations** run as a pre-deploy step; expand-contract only (add column → backfill → switch reads → drop later). Never a destructive migration in a single deploy — the Field app in the wild may be several versions behind.
- **API version support window: 6 months.** Field apps go stale on phones that never update. The `/v1/sync/*` contract in particular must stay backward compatible; the app sends `X-Client-Version` and the server can return a soft "update recommended" or hard "update required" directive.
- **Observability:** OpenTelemetry traces, Sentry on all four product surfaces, resident request/notification delivery telemetry, and a purpose-built **sync health dashboard** (outbox depth per device, oldest unsynced op, push failure rate by error type). If sync silently breaks, techs lose trust in the app permanently — this is the metric to page on.
