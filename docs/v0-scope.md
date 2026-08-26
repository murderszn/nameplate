# Nameplate — V0 Scope

**Goal of V0:** get a real maintenance team at a real 200–500 unit portfolio to tag every in-unit asset and log every service visit for 90 days — and give the remote manager a console where all of it is visible and costed.

**The V0 thesis in one sentence:** *the value is a complete, trustworthy asset registry with real service history; everything else is downstream of that.*

**The one metric that decides whether V0 succeeded:** **scan verification rate** — the percentage of service events and turn items backed by an actual scan. If techs scan, the dataset compounds and every future feature becomes possible. If they don't, no dashboard, model, or feature can save the product. Every scope decision below is subordinate to making scanning fast and making the app never block a tech.

**Timebox:** 12–14 weeks to a design-partner pilot.

---

## 1. IN SCOPE

### 1.1 Nameplate Field (Flutter, iOS + Android)

**Auth & setup**
- Email/password login, long-lived (60d) device-bound refresh so a tech is never logged out mid-shift
- Property picker scoped to `property_assignment`
- Initial sync of the working set with visible progress ("Downloading 1,612 assets…")
- Sync status indicator always visible: synced / N pending / offline

**Scan & identify** — the core loop, must be sub-3-seconds
- QR scan of Nameplate Tags via camera; resolves fully **offline** from local SQLite
- Manual NPID entry with checksum validation (for damaged stickers)
- Search by unit, by serial, by legacy `alt_identifier`
- Every scan logged to `asset_identifier_scan`, including failures and out-of-scope hits

**Tag & create assets**
- Claim a pre-printed NPID → choose category from a 16-icon grid → asset exists. Target: **under 15 seconds.**
- Nameplate photo capture with on-device OCR pre-fill of manufacturer / model / serial
- `asset_model` fuzzy search with create-if-missing (never blocks the tech)
- Optional fields: install date (+ confidence), condition, purchase cost, notes
- Placement guide: one reference photo per category showing where the tag goes

**Asset detail**
- Header: category, model, age, status, current location, last serviced
- **History timeline**: service events, location moves, work orders, parts in/out — one unified reverse-chronological list
- Parts currently installed, with lineage ("control board — from Unit 4B, Mar 3")
- Photos incl. the nameplate photo
- Actions: log service · move · flag issue · report missing

**Log a service event**
- Event type, symptom codes (required, single-tap chips), findings text, resolution code
- Condition before/after, status after
- Labor minutes; parts used/swapped with cost
- **Part swap with source tracing**: "where did this part come from?" → new · from stock · **pulled from another asset** (scan that asset) — this flow is the product's signature and must be excellent
- Repair-vs-replace decision capture, incl. `estimated_repair_cost_if_deferred`
- Before/after photos
- Works entirely offline; queued to the outbox

**Move an asset**
- Scan asset → pick destination (unit, shop, truck, vendor, disposal) → reason → appends to the custody ledger with GPS where permitted
- **Cannot be done as a silent field edit** — enforced by the API

**Turn walkthrough**
- Start a turn on a unit → server-generated checklist from the unit's current asset roster
- Per item: present-ok · damaged · needs service · missing · inaccessible; condition; decision (repair/replace/clean/monitor)
- Add an untagged asset discovered mid-walkthrough (`unexpected_found` → tag it inline)
- Complete → auto-generates work orders for flagged items, updates unit occupancy status
- Fully offline

**My work orders**
- Assigned queue with priority and due date; open · start · complete; attach service events

**Offline infrastructure (the hard part)**
- Full Drift/SQLite mirror of the working set; **UI reads only from local**
- Append-only outbox, UUIDv7-ordered, idempotent push, exponential backoff
- Delta pull on a server sequence cursor with tombstones
- Photo queue: compressed, unmetered-by-default, uploaded independently of records
- Offline NPID block pre-allocation (500 per device)
- Conflict handling per `architecture.md` §4.3 — **no conflict UI ever shown to a tech**
- Diagnostics screen: pending count, oldest unsynced item, force-sync

**Explicitly NOT in the field app:** cost dashboards, portfolio views, other techs' work, analytics.

### 1.2 Nameplate HQ (React web console)

- **Dashboard**: the six overview tiles (`metrics.md` §1) + property league table + at-risk work orders + unresolved reconciliation flags
- **Properties / Buildings / Units**: CRUD, unit detail with current asset roster, open work orders, cost-to-date, turn history
- **Assets**: filterable/sortable table (property, category, status, age, cost, last confirmed); asset detail mirroring the field app plus full cost history; bulk edit; **CSV import** for onboarding
- **Work orders**: create, assign, prioritize, track SLA, close; kanban by status
- **Turns**: monitor in-progress, review completed, act on findings
- **Parts**: salvaged-parts stock list with imputed value; **lineage view** for any part
- **Shrinkage review**: unconfirmed assets ("not seen in N days"), turn-detected missing, location mismatches, unresolved investigations — with a one-click "request verification" that creates a work order
- **Reports (V0 set)**: cost by property/unit/category/model · asset age & past-expected-life · service frequency · work order SLA · shrinkage summary · CSV export of everything
- **Settings**: users, roles, property assignments, invitations; org SLA and replacement-threshold policy; asset categories; **Nameplate Tag print sheets (PDF, sheets of 30)**
- **Audit log viewer** (hq_admin/owner)

### 1.3 Backend

- Postgres 16 (Supabase-managed) + full schema from `data-model.md` §1–7, with the partial unique indexes, custody-ledger constraints, and generated columns
- NestJS + Prisma REST API per `architecture.md` §3, described by OpenAPI 3.1 with generated TS + Dart clients
- Supabase Auth JWTs; RBAC guards + property-scope checks; RLS as defense-in-depth
- `/v1/sync/pull` + `/v1/sync/push` with idempotency and the conflict rules
- NPID minting + block allocation; `assets/lookup` resolver
- Presigned-URL media upload; direct-to-storage
- Transactional service-event write (event + part usages + asset status + WO update in one transaction)
- Custody ledger writes on every move, with the "one open location per asset" constraint
- Turn checklist generation + work-order emission on completion
- 30-day grace-window job: auto-resolve `missing` findings when an asset is scanned elsewhere
- "Not confirmed in N days" nightly sweep → shrinkage list
- Nightly `metric_snapshot` rollups; reports on the read replica with hand-written SQL
- Append-only `audit_log`, monthly partitions
- Async CSV export jobs (BullMQ)
- Seed data: synthetic 3-property / 220-unit / ~900-asset portfolio for demos and tests
- Observability: OTel traces, Sentry, **sync-health dashboard with alerting**

### 1.4 Website (nameplate.app)

Static Astro, five pages, one job: get a portfolio manager to book a demo.

- **Home**: hero (*Every appliance accounted for.*), the problem in three lines, three-step how-it-works (Tag · Scan · Know), field/HQ screenshots, demo CTA
- **Product**: two sections — Nameplate Field, Nameplate HQ
- **Why Nameplate**: the spreadsheet/nothing status quo, shrinkage, repair-vs-replace, warranty leakage
- **Pricing**: per-unit-per-month with a "contact us" CTA. Publish a number — hiding price costs more deals than it wins.
- **Contact / Book a demo**: form → email + CRM
- Legal: privacy, terms, DPA stub
- Brand tokens shared with HQ; SEO basics; Plausible analytics

---

## 2. EXPLICITLY DEFERRED

Not "no" — "not now." Each has a trigger.

### V1 (post-pilot, ~months 4–8)

| Deferred | Why | Revisit when |
|---|---|---|
| **NFC tags** | QR proves the loop first; NFC is 10–30× cost and adds on-metal complexity | A pilot customer reports tag-scanning friction or high shrinkage |
| **Preventive-maintenance scheduling** | Needs a trusted registry first; scheduling against bad data creates noise | Registry completeness > 80% |
| **Tenant-facing request portal** | Different user, different product surface, tenant PII obligations | Customer demand from 2+ accounts |
| **Vendor portal / external contractor access** | New auth surface + billing model | A customer with heavy outsourced maintenance |
| **Purchase orders & inventory ordering** | Adjacent product; big scope | — |
| **Push notifications** | Nice-to-have; V0 techs check the queue | Work-order assignment latency complaints |
| **Offline map / route optimization** | Multi-property routing matters at scale | Portfolios > 10 properties per tech |
| **Warranty auto-tracking & claim workflow** | High value, needs manufacturer data maturity | Serial date-decode coverage > 60% of top brands |
| **Recall matching** | Needs the model catalog to mature | `asset_model` verified coverage > 50% |
| **Parts distributor API integration** | Real value for parts catalog/pricing | Partnership secured |
| **Accounting integrations (QuickBooks/Yardi/RealPage/AppFolio)** | **The biggest V1 ask.** Yardi/RealPage sync of the property/unit roster removes the #1 onboarding objection | First enterprise deal |
| **Custom report builder** | Fixed reports + CSV export covers V0 | Repeated identical export requests |
| **Multi-currency / multi-country** | Schema already supports it; UI doesn't | First non-US customer |
| **SSO / SAML** | Enterprise gate | First enterprise deal |
| **MFA** | Should be early-V1 regardless | — |
| **Part movement ledger (`part_movement`)** | `part.status` + `part_usage` is enough traceability for V0 | Parts inventory becomes a managed workflow |
| **Bulk asset transfer between properties** | Rare; do it via support in V0 | — |
| **In-app onboarding/training flows** | White-glove the pilot manually — and learn more that way | 3+ self-serve customers |

### V2+ (needs accumulated data or a new business motion)

- **All predictive models** (`metrics.md` §4): survival/lifespan, predictive maintenance, cost anomaly detection, ML shrinkage scoring, replace-vs-replace optimization. **Precondition: 2+ years history, 20k+ assets, 100k+ service events, >70% data completeness.** V0's shrinkage detection is deliberately a transparent rule-based score, not a model.
- **Cross-customer benchmarking data product** — needs scale, k-anonymity, and consent
- **IoT / sensor telemetry ingestion** — worthless on top of an incomplete registry
- **Cross-org asset recovery brokering** (a walked-off asset surfacing at another customer) — needs multiple customers in one metro
- **Manufacturer B2B API partnerships**
- **Server-side OCR model fine-tuned on our nameplate corpus**
- **Public API + webhooks for partners**
- **White-label / property-management-company reseller tier**
- **Commercial/non-residential asset types** (elevators, boilers, pools, common-area equipment) — the schema generalizes; the workflows don't
- **Native tablet-optimized HQ**, offline HQ

---

## 3. Non-negotiables for V0

Cut features before cutting any of these:

1. **The field app works with zero signal, always.** Not degraded — identical.
2. **The custody ledger is append-only and complete.** Location changes only via the move endpoint.
3. **A tech is never blocked and never shown a conflict.** Unknown model, unreadable serial, closed work order — the app records the fact and moves on.
4. **NPID is globally unique and immutable.**
5. **Cost is captured on every service event**, even estimated, with `cost_source` marking quality.
6. **`symptom_codes` are required** on repair events.
7. **No technician surveillance UI.** Shrinkage is about assets. Ever violating this loses the field, and losing the field loses the product.
8. **Every HQ number drills down to rows.**
9. **Sync health is monitored and alerted on** from day one.
10. **Data completeness is displayed honestly**, never hidden behind confident-looking averages.

---

## 4. Sequencing

| Phase | Weeks | Deliverable |
|---|---|---|
| 0 — Foundations | 1–2 | Monorepo, Postgres schema + migrations, auth, RBAC, OpenAPI skeleton, CI, seed data |
| 1 — Registry | 3–5 | Assets/locations/NPID/lookup API · Flutter scan + tag + asset detail · HQ asset table · **tag print sheets** |
| 2 — Service | 5–8 | Service events, parts + lineage, work orders · Field logging flows · HQ work-order board |
| 3 — Offline | 7–10 | Sync engine, outbox, delta pull, media queue, conflict rules, sync-health dashboard. *(Overlaps phase 2 deliberately — sync is designed in from the start and hardened here.)* |
| 4 — Turns & shrinkage | 9–11 | Turn workflow, grace-window job, unconfirmed-asset sweep, HQ shrinkage review |
| 5 — Reporting & polish | 11–13 | `metric_snapshot` rollups, V0 reports, CSV export, dashboard tiles, audit viewer |
| 6 — Website & pilot | 12–14 | Marketing site, TestFlight/Play internal, onboard design partner, tags printed and shipped |

**Pilot exit criteria (90 days in):**
- ≥ 95% of in-unit assets at the pilot property tagged and categorized
- ≥ 80% of service events logged in-app rather than on paper
- **Scan verification rate ≥ 70%**
- Zero data-loss incidents from offline sync
- The remote manager voluntarily opens HQ ≥ 3×/week
- At least one shrinkage or warranty-leakage finding the customer didn't previously know about — the moment the product proves it pays for itself
