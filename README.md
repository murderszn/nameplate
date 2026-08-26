# Nameplate

*Every appliance accounted for.*

Nameplate is asset-registry and maintenance-tracking software for apartment
portfolios. Every major in-unit appliance (washer, dryer, range, HVAC,
fridge, water heater) gets a scannable **Nameplate Tag**. Technicians use
**Nameplate Field** to scan, inspect, and log service in the field; portfolio
managers use **Nameplate HQ** to see every asset, work order, and cost
across every property from one console — without visiting a single unit.

The V0 thesis: a complete, trustworthy asset registry with real service
history is the product; everything else (analytics, shrinkage detection,
predictive maintenance) is downstream of that. Start with
[`docs/overview.md`](docs/overview.md) for the plain-English pitch and
current state, then [`docs/v0-scope.md`](docs/v0-scope.md) for the full V0
cut and [`docs/architecture.md`](docs/architecture.md) for the system
design.

## Repo layout

| Path | What it is | Status |
|---|---|---|
| [`docs/`](docs) | Product overview, architecture, data model, branding, tagging strategy, metrics, V0 scope | Written — read this first |
| [`website/`](website) | Public marketing splash page, deployed to GitHub Pages | Built, redesigned, ready to deploy |
| [`app/`](app) | **Nameplate Field** — Flutter app (iOS + Android) for technicians | Running in iOS Simulator; UI shell + models scaffolded, offline sync not yet wired |
| [`backend/`](backend) | **Nameplate API** — NestJS + Prisma + PostgreSQL | **Running local demo**: migrated schema, seeded portfolio, live endpoints. Auth not yet wired |
| [`hq/`](hq) | **Nameplate HQ** — React + TypeScript web console for portfolio managers | **Running local demo**, wired to the live API with real seeded data |

## Try the live demo

`backend/` and `hq/` are a real, runnable demo — not just a scaffold —
seeded with a demo portfolio (Sonoran Portfolio Management: 4 properties,
22 units, 22 assets, service events with parts lineage, work orders in
various states).

```bash
# 1. Postgres (Homebrew, macOS)
brew services start postgresql@14

# 2. Backend — http://localhost:3000
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev

# 3. HQ console — http://localhost:5173
cd ../hq
npm install
npm run dev
```

Full details, endpoint list, and troubleshooting: [`backend/README.md`](backend/README.md) and [`hq/README.md`](hq/README.md).

The field app: `cd app && flutter pub get && flutter run` (see [`app/README.md`](app/README.md)).
The marketing site: open `website/index.html` directly, or `cd website && python3 -m http.server` (see [`website/README.md`](website/README.md)).

## Where to start

- What Nameplate is and where things stand right now: [`docs/overview.md`](docs/overview.md)
- Product/business context: [`docs/v0-scope.md`](docs/v0-scope.md)
- System design & stack rationale: [`docs/architecture.md`](docs/architecture.md)
- Data model: [`docs/data-model.md`](docs/data-model.md)
- Asset tagging strategy (QR/NPID vs manufacturer serials): [`docs/asset-tagging-strategy.md`](docs/asset-tagging-strategy.md)
- Metrics & analytics roadmap: [`docs/metrics.md`](docs/metrics.md)
- Brand, naming, and palette: [`docs/branding.md`](docs/branding.md)
- Each subfolder has its own README with setup/run instructions.
