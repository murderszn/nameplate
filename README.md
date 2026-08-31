<p align="center">
  <img src="website/images/nameplate-logo-transparent.png" width="160" alt="Nameplate Brand Mark" />
</p>

<h1 align="center">Nameplate</h1>
<p align="center"><em>Every appliance accounted for.</em></p>

Nameplate is the physical asset registry and offline-first maintenance ledger for apartment portfolios. Every major in-unit appliance (refrigerators, ranges, washers, dryers, HVAC split systems, water heaters) is affixed with a tamper-evident, scannable **Nameplate Tag**. 

- **Technicians** use **Nameplate Field** (Flutter) to scan, inspect, harvest donor parts, and log service events even in signal-dead basements and utility closets.
- **Portfolio Managers** use **Nameplate HQ** (React + TypeScript) to track asset lifecycle, dispatch work orders with SLA countdowns, prevent equipment shrinkage, and analyze repair-vs-replace economics across properties.
- **Residents** use **Nameplate Portal** (React + TypeScript) to scan appliance tags, report maintenance requests with photos, and track repair appointments in real time.
- **Backend API** (NestJS + Prisma + PostgreSQL) provides monotonic delta sync, idempotent UUIDv7 batch mutation reconciliation, and cryptographic pre-allocated tag pools.

<p align="center">
  <img src="docs/images/appliance_asset_registry_overview.png" alt="Appliance Asset Registry Overview Architecture" width="100%" />
</p>

---

## 🏛️ System Architecture

```
                          ┌───────────────────────────────┐
                          │      Nameplate HQ (React)     │
                          │   hq.nameplate.app  (CDN/SPA) │
                          └───────────────┬───────────────┘
                                          │  REST/JSON (online, per-request)
                                          │
┌──────────────────────────┐              ▼
│  Nameplate Field         │   ┌──────────────────────────────────────┐
│  (Flutter, iOS/Android)  │   │        Nameplate API (NestJS)        │
│                          │   │  ┌────────────────────────────────┐  │
│  ┌────────────────────┐  │   │  │ auth guard / RBAC / org scope  │  │
│  │ Drift (SQLite)     │  │   │  ├────────────────────────────────┤  │
│  │  local mirror      │◄─┼───┼──┤ /v1/*  resource endpoints      │  │
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

### Architectural Principles & Invariants
1. **Offline-First Append-Only Ledger**: Mobile writes are committed locally first with client-generated **UUIDv7** identifiers and monotonic sequence numbers (`occurred_at` vs. `recorded_at`), ensuring full operation in signal-dead utility rooms without data loss.
2. **Part Harvesting & Genealogy**: Tracks cannibalized parts (`sourceAssetId`, `salvagedAt`) between donor appliances and recipient equipment to maintain true hardware pedigree.
3. **Cryptographic Tag Integrity**: Crockford Base32 identifiers (`NP-XXXXXXXX`) with Luhn mod-32 check digits and HMAC-SHA256 digital signatures for instant offline authenticity verification.
4. **Repair vs. Replace Costing**: Dynamic real-time calculation combining accumulated lifecycle spend, technician labor ($85/hr standard), and part costs against replacement benchmarks.

---

## ⚡ Current Featureset Matrix

### 📱 1. Nameplate Field App (Flutter · iOS, Android, Web)
- **Branded Startup & Splash**: Native splash screen ([`app/lib/screens/splash_screen.dart`](app/lib/screens/splash_screen.dart)) with the official Nameplate logo, 28px dot grid, and animated runtime ledger initialization.
- **High-Performance 1:1 Tag Scanner**: Square reticle with laser sweep animation, instant Crockford-32 check-digit validation, HMAC-SHA256 signature verification, and unassigned tag claiming flow.
- **Turn Walkthrough & Photo Loop**: Room-by-room inspection workflow with full 6–8 appliance unit rosters, photo capture, condition rating, and automated SLA-driven work order emission.
- **Service & Part Harvesting Engine**: Diagnostic symptom code selection, van stock vs. harvested donor unit parts tracking, repair notes, and live repair-vs-replace cost calculator.
- **Adaptive Layout**: Responsive bottom navigation bar on phones and full-height side rail on tablets.
- **Sync Status & Watermarks**: Real-time sync badge indicating outbox mutation count, connection health, and offline status.

### 💻 2. Nameplate HQ Console (React + TypeScript + Vite)
- **Instant Pre-Mount Loader**: Theme-aware dark/light loading screen inside `#root` with the official logo for zero flash during script download.
- **Portfolio Overview & Multi-Property Dashboard**: High-level KPIs across properties (Sonoran Ridge, Scottsdale Vista, Camelback Vista, Desert Palm), asset counts, open work orders, and health metrics.
- **Interactive Asset Registry**: Deep appliance lineage timeline, location history, manufacturer details, replacement cost tracking, and fast search (`⌘K`).
- **Kanban & List Work Order Dispatcher**: Live work order queue categorized by status (`Submitted`, `Scheduled`, `In progress`, `Completed`), urgency badges, and real-time SLA countdown clocks.
- **Fleet Analytics & Intelligence**: Equipment longevity cohorts, annualized maintenance cost curves, brand failure rates, and replacement budget forecasting.
- **Sync Operations Cockpit**: Live watermark sequence tracking, outbox audit log, printable batch sticker generator with SVG/CSV export, and cryptographic matrix inspector.

### 🏠 3. Nameplate Resident / Renter Portal (React + TypeScript + Vite)
- **Zero-Flicker Pre-Mount Loader**: Styled loading state with dark/light logo switching matching the user's active theme.
- **Tag-Linked Issue Submission**: Resident reports link directly to an appliance by scanning the physical tag or selecting from their unit roster.
- **Resident-Safe Work Order Tracking**: Visual progress pipeline (`Submitted` → `Scheduled` → `In progress` → `Completed`) with appointment windows.
- **My Appliances Roster**: In-unit equipment directory featuring high-resolution isometric schematics (`schematics/*.png`) and service timestamps.
- **Safety Triage & Emergency Alerts**: Clear emergency instructions and urgent maintenance flags for active leaks, gas, or HVAC outages.

### ⚙️ 4. Backend Sync Engine & API (NestJS + Prisma + PostgreSQL)
- **Monotonic Sync Delta Stream (`POST /v1/sync/pull`)**: Sequence-based pull endpoint returning all mutations since client watermark with tombstones.
- **Idempotent Outbox Mutation Processor (`POST /v1/sync/push`)**: Batch mutation endpoint for offline service events, asset status updates, and turn checklists.
- **Pre-Allocated Tag Block Allocator (`POST /v1/sync/allocate-block`)**: Allocates batches of 500 pre-signed cryptographic NPIDs to field devices for disconnected tagging.
- **Relational Domain Schema**: Strict referential integrity for Organizations, Properties, Buildings, Units, Assets, Service Events, Part Usages, Parts, and Work Orders.

### 🏷️ 5. Cryptographic Tag & QR Engine (Python CLI)
- **Deterministic Minting**: Zero-dependency Python engine ([`scripts/nameplate_qr.py`](scripts/nameplate_qr.py)) implementing Crockford Base32 with check digits and HMAC-SHA256 signature generation.
- **Printable 30-Tag SVG Sheet**: Generates industrial 30-up sticker sheets (`sheet_30.svg`) formatted for thermal transfer and holographic polyester stock.
- **Tag Verification & URL Parsing**: Resolves compact hardware URIs (`np://t/...`) and public web links (`https://np.app/a/...`).

---

## 🏢 Portfolio Context & Properties

<p align="center">
  <img src="website/images/properties/scottsdale_vista.jpg" width="24%" alt="Scottsdale Vista" />
  <img src="website/images/properties/sonoran_ridge.jpg" width="24%" alt="Sonoran Ridge" />
  <img src="website/images/properties/camelback_vista.jpg" width="24%" alt="Camelback Vista" />
  <img src="website/images/properties/desert_palm.jpg" width="24%" alt="Desert Palm Commons" />
</p>

| Property | Units | Core Equipment Standard | Active SLA Profile |
|---|---|---|---|
| **Scottsdale Vista** | 84 Units | Whirlpool Stainless Suite, Carrier HVAC, Rheem 50G Water Heaters | 4h Emergency / 24h Urgent |
| **Sonoran Ridge** | 120 Units | GE EnergyStar Appliance Suite, Trane High-Efficiency Heat Pumps | 4h Emergency / 24h Urgent |
| **Camelback Vista** | 64 Units | Samsung Commercial Stack, Goodman Split HVAC Systems | 4h Emergency / 24h Urgent |
| **Desert Palm** | 96 Units | Frigidaire Pro Kitchen Suite, Rheem Performance Heaters | 4h Emergency / 24h Urgent |

---

## 🛠️ Stack & Repository Layout

| Path | Surface / Module | Technology | Test / Build Status |
|---|---|---|---|
| [`app/`](app) | **Nameplate Field** | Flutter 3.x / Dart 3.x, Riverpod | **17/17 Tests Passing** (`flutter test`, `flutter analyze` clean) |
| [`hq/`](hq) | **Nameplate HQ** | React 19, TypeScript, Vite, React Router | **Clean Production Build** (`npm run build` -> `website/hq/`) |
| [`portal/`](portal) | **Nameplate Resident** | React 19, TypeScript, Vite | **Clean Production Build** (`npm run build` -> `website/portal/`) |
| [`backend/`](backend) | **Nameplate API** | NestJS, Prisma ORM, PostgreSQL | **22/22 Tests Passing** (9/9 Jest suites, `npm run build` clean) |
| [`scripts/`](scripts) | **Tag & QR Generator** | Python 3 (zero dependencies) | **7/7 Python Tests Passing** (`unittest`) |
| [`website/`](website) | **Public Web & Assets** | HTML5, CSS3, Vanilla JS, Hosted Builds | Live static bundle ready for CDN deployment |
| [`docs/`](docs) | **System Documentation** | Markdown, Specifications | Complete architecture and data models |

---

## 🚀 Quickstart & Development

### 1. Flutter Field App
```bash
cd app
flutter pub get
flutter run
```
*Supports iOS Simulator, Android Emulator, and Web (`flutter run -d chrome`).*

### 2. Backend Sync API
```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```
*API runs at `http://localhost:3000`.*

### 3. HQ Management Console
```bash
cd hq
npm install
npm run dev
```
*Console runs at `http://localhost:5173` (builds to `website/hq/`).*

### 4. Resident Web Portal
```bash
cd portal
npm install
npm run dev
```
*Resident portal runs at `http://localhost:5174` (builds to `website/portal/`).*

### 5. Cryptographic Tag & Sheet CLI
```bash
# Mint a batch of cryptographic NPIDs
python3 scripts/nameplate_qr.py mint --batch BATCH-2026-08A

# Generate a 30-up printable SVG sticker sheet
python3 scripts/nameplate_qr.py sheet --count 30 --out sheet_30.svg
```

---

## 📖 Deep-Dive Documentation
- **[System Architecture](docs/architecture.md)** — Four product surfaces, offline sync protocol, backend design decisions, and data boundaries.
- **[Data Model & Schema](docs/data-model.md)** — Complete Prisma schema, UUIDv7 conventions, ledger event types, and audit logging.
- **[Asset Tagging Strategy](docs/asset-tagging-strategy.md)** — Physical substrate choices, Crockford Base32 encoding, QR error correction, and HMAC validation.
- **[Resident Portal Backend Plan](docs/resident-portal-backend-plan.md)** — Resident authentication boundaries, tenant isolation, and work-order pipeline.
- **[Product Scope & V0 Decisions](docs/v0-scope.md)** — Core scope, non-negotiable requirements, and operational workflows.
- **[Brand & Design Standards](docs/branding.md)** — Typography, color tokens, voice guidelines, and logo specifications.
