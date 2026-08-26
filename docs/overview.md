# Nameplate — what we're doing here

## The problem

Apartment portfolios run on appliances nobody is tracking. A property with
200 units has 200+ washers, dryers, ranges, HVAC units, water heaters,
fridges — each with its own age, manufacturer, service history, and
replacement cost. Today almost none of that is written down anywhere
consistent:

- **Assets go missing.** A working appliance from one unit ends up in
  another, or leaves with a vendor during a "repair," and nobody notices
  for months — if ever.
- **Service history is oral tradition.** Whoever serviced a unit last year
  remembers what they did, if they still work there. There's no record of
  parts swapped, what's still under warranty, or whether a unit is a repair
  candidate or a write-off.
- **HQ is blind.** A portfolio manager overseeing dozens of properties from
  one office has no way to see, in one place, what's broken, what's aging
  out, what a turn is going to cost, or which property is bleeding money on
  repeat repairs.

## The bet

A trustworthy, portfolio-wide **asset registry with real service history**
is the product. Everything people actually want eventually — shrinkage
detection, predictive maintenance, spend analytics — is a query on top of
that registry, not a separate thing to build. So V0 is entirely about
making the registry good, not about building every downstream feature.

## The two-tool system

- **Nameplate Field** (Flutter, iOS + Android) — what a technician carries.
  Scan an asset's QR tag, see its full history (age, last service, parts
  swapped, current status), log a new service event, flag something
  missing or broken, or run a full turn-inspection checklist unit by unit.
- **Nameplate HQ** (web console) — what a portfolio manager sees. Every
  property, every asset, every open work order, in one dashboard, from
  anywhere — no site visit required to know what's going on.

Both talk to one backend API that is the shared system of record.

## The tagging approach

There's no universal database of manufacturer serial numbers we can just
call — GE, Whirlpool, Frigidaire, LG, etc. all keep that data to
themselves, if they keep it at all. So the plan is a hybrid: mint our own
**Nameplate ID (NPID)** as a printed QR sticker on every asset — that's the
canonical, always-scannable key — and store the manufacturer's own
serial/model as an attribute underneath it, enriched over time by our own
crowd-populated model catalog. Full reasoning in
[`asset-tagging-strategy.md`](asset-tagging-strategy.md).

## Where this actually stands right now

This is a **V0 demo**, not a finished product. Concretely, as of this
writing:

- **`backend/`** is a real NestJS + PostgreSQL API, running locally against
  a migrated schema and seeded with a realistic demo portfolio (one
  organization, 4 properties, 22 units, 22 assets, service events including
  a traced parts-lineage example, and work orders in several states). Asset
  lookup-by-scan and service-event logging are fully wired; most other
  endpoints are read-only stubs.
- **`hq/`** is a React console wired to that live API — the dashboard,
  properties, assets, and work-orders pages render real seeded data, not
  placeholders.
- **`app/`** is a Flutter app running in the iOS Simulator, with the field
  screens (scan, asset detail, log service, flag missing, turn walkthrough)
  scaffolded against in-memory demo data — offline sync to the real backend
  isn't wired yet.
- **`website/`** is a static marketing splash page ready to deploy to
  GitHub Pages.
- Not yet built: auth/roles, the offline sync engine, the append-only
  custody ledger that anti-shrinkage detection depends on, turns, media
  uploads, and reporting. These are named explicitly (not silently skipped)
  in [`v0-scope.md`](v0-scope.md) and the `backend/`/`hq/` READMEs.

## Map of the docs

| Doc | What's in it |
|---|---|
| [`v0-scope.md`](v0-scope.md) | Exactly what's in and out of V0, by tool |
| [`architecture.md`](architecture.md) | Stack choice and why, sync design, API conventions |
| [`data-model.md`](data-model.md) | Every entity, field, and constraint |
| [`asset-tagging-strategy.md`](asset-tagging-strategy.md) | NPID vs manufacturer serial, in depth |
| [`metrics.md`](metrics.md) | Dashboard KPIs and future analytics-model ideas |
| [`branding.md`](branding.md) | Name, tagline, palette, logo concept, brand voice |
