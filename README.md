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
predictive maintenance) is downstream of that. See
[`docs/v0-scope.md`](docs/v0-scope.md) for the full V0 cut and
[`docs/architecture.md`](docs/architecture.md) for the system design.

## Repo layout

| Path | What it is | Status |
|---|---|---|
| [`docs/`](docs) | Product architecture, data model, branding, tagging strategy, metrics, and V0 scope | Written — read this first |
| [`website/`](website) | Public marketing splash page, deployed to GitHub Pages | Scaffolded, ready to deploy |
| [`app/`](app) | **Nameplate Field** — Flutter app (iOS + Android) for technicians | Scaffolded UI shell + models, offline sync not yet wired |
| [`backend/`](backend) | **Nameplate API** — NestJS + Prisma + PostgreSQL | Scaffolded schema + Asset/ServiceEvent modules, auth not yet wired |
| [`hq/`](hq) | **Nameplate HQ** — React + TypeScript web console for portfolio managers | Scaffolded shell + routes, not yet wired to the API |

## Where to start

- Product/business context: [`docs/v0-scope.md`](docs/v0-scope.md)
- System design & stack rationale: [`docs/architecture.md`](docs/architecture.md)
- Data model: [`docs/data-model.md`](docs/data-model.md)
- Brand, naming, and palette: [`docs/branding.md`](docs/branding.md)
- Each subfolder has its own README with setup/run instructions.
