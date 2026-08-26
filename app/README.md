# Nameplate Field

Nameplate Field is the mobile app for maintenance technicians in the
Nameplate apartment-portfolio maintenance/asset-tracking platform. It's a
Flutter app (iOS + Android) that a tech uses to scan a Nameplate Tag on an
appliance, view its service history and current location, log a service
event, flag an asset missing or broken, and run a unit "turn" (turnover)
inspection walkthrough — all with **zero network signal assumed**.

See the repo-level docs for the full picture:

- [`docs/architecture.md`](../docs/architecture.md) — system architecture,
  including **§4 Offline-first sync strategy**, which this app is built
  around: a full Drift (SQLite) local mirror, an append-only outbox keyed
  on UUIDv7 op ids, and a server-sequence delta cursor for `/v1/sync/pull`.
  Read this before touching anything under `lib/services/` or (once it
  exists) `lib/sync/` or `lib/data/`.
- [`docs/data-model.md`](../docs/data-model.md) — the Postgres schema this
  app's models mirror (`Asset`, `ServiceEvent`, `Part`/`PartUsage`,
  `Unit`/`Property`, `Turn`/`TurnItem`).
- [`docs/v0-scope.md`](../docs/v0-scope.md) — what's actually in V0 for the
  field app vs. deferred.
- [`docs/branding.md`](../docs/branding.md) — brand voice and the color
  palette used in `lib/theme/app_theme.dart`.

## Status

This is a **scaffold**: the UI shell, screens, and domain models exist, but
the repository/service layer (`lib/services/`) is stubbed with in-memory
data and TODOs. There is no real networking, no Drift database, and no
generated OpenAPI client wired up yet — those are the next milestones per
`architecture.md` §6 (`lib/data/local`, `lib/data/remote`, `lib/sync/`).

## Running it

```bash
flutter pub get
flutter run
```

Run tests and static analysis:

```bash
flutter test
flutter analyze
```

## Structure

```
lib/
  main.dart              app entrypoint, theme wiring
  theme/                 brand palette + ThemeData (docs/branding.md §6)
  models/                plain Dart classes mirroring data-model.md entities
  services/              repository/service stubs — TODOs reference the
                          sync design in architecture.md §4
  screens/
    app_shell.dart        bottom-nav shell
    scan/                 scan/lookup an asset
    asset/                asset detail (history, location, status) + flag
                           missing/broken
    service/              log a service event
    turn/                 unit turn inspection walkthrough
    workorder/             my work orders (placeholder)
    settings/              sync diagnostics, auth/property scope (placeholder)
  widgets/                shared widgets (sync status badge)
```

State management is **Riverpod** (`flutter_riverpod`), per the stack
decision in `architecture.md` §6.
