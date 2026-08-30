# Nameplate Supabase backend runbook

This runbook describes the reproducible deployment path for the Nameplate
Postgres/Auth/Storage foundation. Supabase is managed infrastructure; NestJS
remains the only business API.

## Migration ownership and order

`supabase/migrations/` is the deployable CLI chain. Prisma's schema and
forward migration remain under `backend/prisma/` for generated types and
developer workflows.

1. `20260826180948_init.sql` — original core schema.
2. `20260829120000_foundation.sql` — designed V0 tables, generated columns,
   checks, custody exclusion, UTC timestamps, deterministic normalization,
   partial indexes, and append-only audit enforcement.
3. `20260829130000_tenant_security.sql` — auth helpers, RLS on all 28 tables,
   non-bypass application role, and idempotent `auth.users` synchronization.
4. `20260829140000_media_storage.sql` — private media bucket and property-
   scoped object policies.
5. `20260830010000_user_invite_activation.sql` — projects Auth invitation
   state and activates pending memberships when an invited user confirms.

Never edit a migration that has reached a shared Supabase environment. Add a
new forward migration instead.

## Environment contract

Copy `backend/.env.example` to a local, ignored `.env`. Runtime uses
`DATABASE_URL`; migrations and Studio use `DIRECT_URL`. Production also
requires `SUPABASE_URL` and explicit `CORS_ORIGINS`. Maintenance-user
invitations additionally require the server-only `SUPABASE_SECRET_KEY` and an
allowlisted `INVITE_REDIRECT_URL`. No password, JWT, secret key, or database
URL belongs in source control or browser code.

Use a session-pooled or direct connection for the persistent NestJS service.
The tenant transaction helper uses an interactive transaction, `SET LOCAL
ROLE nameplate_app`, and transaction-local org/user GUCs; do not route that
workflow through a transaction pooler that cannot preserve transaction state.

## Preflight and deployment

From the repository root, while linked to the intended project:

```bash
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked
supabase db lint --linked --level warning
```

From `backend/`:

```bash
npm run prisma:validate
npm run prisma:generate
npm run build
npm test -- --runInBand
```

Do not seed a shared or production database automatically. The deterministic
seed intentionally creates 3 properties, 220 units, 900 assets, and synthetic
history. Run it only against an empty local or explicitly disposable staging
database:

```bash
npm run prisma:seed
```

## Post-deploy verification

- Confirm all 28 Nameplate tables exist and have RLS enabled.
- Run `supabase/tests/security_static.test.sql` with `psql`.
- Verify `nameplate_app` is `NOLOGIN` and cannot bypass RLS.
- Create/update a disposable Auth user twice and confirm exactly one matching
  `user_account` row exists.
- Test an owner and a property-assigned technician against two properties;
  the technician must receive problem-details `403` responses outside scope.
- Upload a disposable object beneath
  `org/<org-id>/property/<property-id>/...`; verify a technician assigned only
  elsewhere cannot read it.
- Confirm a direct overlapping `asset_location` insert is rejected.
- Confirm UPDATE/DELETE against `audit_log` is rejected.

## Recovery and rollback

Schema migrations are forward-only. Before production migration, record the
Supabase backup/PITR state and open a restore point. If deployment fails before
commit, fix the SQL and re-run. If it commits and application behavior fails,
roll the API back first, preserve the database, and ship a corrective forward
migration. Never hand-delete migration history.

Before pilot launch, rehearse a staging restore and record the achieved RPO
and RTO. Backup/PITR enablement and a successful restore drill remain an
operations gate; this repository cannot prove them by configuration alone.
