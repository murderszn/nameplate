# Nameplate HQ — `hq/`

The portfolio-manager web console. React 18+ / TypeScript / Vite, per
**`../docs/architecture.md`** §1 and §6 ("Create `hq/` as a fourth
top-level directory" — this app has a different audience, auth model,
and build pipeline than `website/`, so it isn't nested inside it).

This started as a **V0 scaffold** and is now wired to the live `backend/`
API: Dashboard, Properties, Assets, and Work Orders all fetch and render
real seeded data (loading/error states included) via a minimal fetch
client in `src/api/client.ts` — no heavy data-fetching library.

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
│   ├── api/
│   │   └── client.ts        minimal fetch client — bootstraps the demo org, then
│   │                         GET /v1/properties, /v1/assets, /v1/work-orders, etc.
│   └── routes/
│       ├── Dashboard.tsx    live KPI tiles + property league table + at-risk work orders
│       ├── Properties.tsx   live properties table
│       ├── Assets.tsx       live asset registry/search table
│       └── WorkOrders.tsx   live kanban-by-status board
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

## Setup — running the demo locally

This console has nothing to show without the backend running and seeded
first — see `backend/README.md` for standing up Postgres, migrating, and
seeding the demo portfolio. Once `backend` is running on
`http://localhost:3000`:

```bash
cd hq
npm install
npm run dev       # http://localhost:5173
```

Open `http://localhost:5173` — the Dashboard should show real KPI counts
(assets tracked, properties, open work orders, flagged/missing assets),
and Properties/Assets/Work Orders should list the seeded demo portfolio.

By default the API client (`src/api/client.ts`) points at
`http://localhost:3000`. Override with a `.env` containing
`VITE_API_URL=http://localhost:PORT` if the backend runs elsewhere. CORS
is already enabled on the backend for cross-origin requests from the Vite
dev server.

```bash
npm run build      # tsc -b && vite build
npm run preview
```

## Next steps toward the real V0 (see `docs/v0-scope.md` §1.2)

1. Auth (Supabase JWT) + route guards by role (`architecture.md` §5).
2. Richer tables (sort/paginate/bulk-edit, TanStack Table) beyond the current simple client-side filter.
3. Turns, Parts/lineage, Shrinkage review, Reports, Settings, Audit log routes.
4. Recharts for the dashboard tiles and the reports section.
5. Replace the hand-rolled fetch client with the generated `@nameplate/ts-client` once the OpenAPI spec exists.
