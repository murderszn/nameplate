# Nameplate HQ — `hq/`

The portfolio-manager web console. React 18+ / TypeScript / Vite, per
**`../docs/architecture.md`** §1 and §6 ("Create `hq/` as a fourth
top-level directory" — this app has a different audience, auth model,
and build pipeline than `website/`, so it isn't nested inside it).

This is a **V0 scaffold**: a routed shell with placeholder pages, not a
finished console. It exists so the layout, nav, and brand tokens are in
place before wiring up real data.

## What's here

```
hq/
├── src/
│   ├── main.tsx
│   ├── App.tsx              Router: Dashboard / Properties / Assets / Work Orders
│   ├── index.css            imports styles/global.css
│   ├── styles/
│   │   ├── tokens.css       brand palette as CSS variables — docs/branding.md §6
│   │   └── global.css       shell/layout/table/card/pill styles built on the tokens
│   ├── components/
│   │   ├── Layout.tsx       sidebar nav + top bar + <Outlet/>
│   │   └── KpiTile.tsx      shared stat-tile component
│   └── routes/
│       ├── Dashboard.tsx    KPI tiles + property league table + reconciliation flags (placeholders)
│       ├── Properties.tsx   properties table (placeholder)
│       ├── Assets.tsx       asset registry/search table (placeholder)
│       └── WorkOrders.tsx   kanban-by-status board (placeholder)
└── vite.config.ts
```

Full route set per `docs/v0-scope.md` §1.2 also includes Buildings/Units
detail, Turns, Parts (with lineage view), Shrinkage review, Reports,
Settings, and the Audit log viewer — not scaffolded yet; add them as
routes under the same `Layout`.

## Brand tokens

`src/styles/tokens.css` mirrors `docs/branding.md` §6 exactly:

- `--np-plate-600: #0b5d8a` — primary brand (plate blue)
- `--np-signal-500: #f0a028` — accent/attention (safety amber; background/stroke only, never text — use `--np-caution-600` for amber text)
- Plus the full ink/slate/steel/mist neutral ramp and the fixed-meaning status colors (verified/caution/fault/offline).

Per `architecture.md` §6, this file should stay in lockstep with
`website/src/styles/tokens.css` once the marketing site exists — same
token names, same values, no drift.

## Setup

```bash
cd hq
npm install
npm run dev       # http://localhost:5173
npm run build      # tsc -b && vite build
npm run preview
```

No environment variables are required to view the scaffold — every page
renders placeholder/empty states. Wiring to the live API (`api.nameplate.app`
per `architecture.md` §6) happens through a future `src/lib/api.ts` that
wraps the generated `@nameplate/ts-client` from the OpenAPI spec in
`backend/packages/contracts`; that client doesn't exist yet in this V0
scaffold.

## Next steps toward the real V0 (see `docs/v0-scope.md` §1.2)

1. `src/lib/api.ts` + TanStack Query for data fetching against the `backend/` API.
2. Auth (Supabase JWT) + route guards by role (`architecture.md` §5).
3. Real tables (TanStack Table) replacing the empty-state placeholders.
4. Turns, Parts/lineage, Shrinkage review, Reports, Settings, Audit log routes.
5. Recharts for the dashboard tiles and the reports section.
