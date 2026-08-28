# Backend POC options

## Recommendation

Keep the current NestJS + Prisma API contract and use **Supabase Postgres** as the first real backend. Nameplate's core questions cross Organization → Property → Unit → Asset → Service Event → Parts and need transactions, reporting, audit history, and tenant isolation. Supabase gives managed Postgres, Auth, storage, backups, and a quick local development story without changing the domain model.

## When each option fits

| Option | Good for | Trade-off for Nameplate |
|---|---|---|
| MongoDB + Compass | Fast schema exploration, JSON inspection, throwaway ingestion experiments | Compass is a client, not a backend. Document references and aggregation pipelines make custody history, costs, and tenant-safe reporting harder. Use only for a short schema spike, not the system of record. |
| Supabase | Postgres, Auth, storage, local CLI, SQL reporting, RLS defense-in-depth | We still own NestJS business workflows and offline sync. That is the right complexity boundary. |
| Firebase / Firestore | Mobile-first prototypes with excellent offline primitives | No native joins and limited reporting; denormalized rollups become correctness-sensitive for service cost and audit data. |
| Cloudflare D1 / Workers | Edge API, low-latency reads, simple deployment, static HQ hosting | SQLite/D1 is not the best primary store for the relational ledger and reporting workload. Pair Workers with Supabase rather than replacing Postgres for V0. |

## Suggested sequence

1. Run existing Prisma migrations and seed against Supabase locally/remotely.
2. Add Supabase Auth JWT validation in NestJS, then org/role/property-scope guards.
3. Keep HQ and Field behind the versioned REST API; do not let either client become a second data layer.
4. Add the transactional service-event endpoint and idempotency keys before wiring offline push.
5. Host the HQ SPA on Cloudflare Pages; use Workers later as an edge cache/proxy if needed.
