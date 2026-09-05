# Nameplate Python Backend & Supabase Bridge — `backend_py/`

High-throughput FastAPI REST gateway and live cloud replication bridge for the Nameplate platform.

## Overview

`backend_py/` serves two primary roles:
1. **Local Development Gateway (`http://localhost:8080`)**: Provides high-performance REST endpoints for the Flutter field app (`app/`), Nameplate HQ console (`hq/`), and public web demonstrations.
2. **Live Supabase PostgreSQL Bridge (`supabase_sync.py`)**: Automatically mirrors all mutations (mobile outbox sync pushes, work order status transitions, asset additions, and service events) to live managed PostgreSQL on Supabase (`aifsfmvvcnxowmbuorbx.supabase.co`).

For the consolidated 28-table schema catalog, endpoint maturity matrix, and technical roadmap, see:
👉 **[`../website/backend.html`](../website/backend.html)**

---

## Directory Structure

```
backend_py/
├── main.py                  # FastAPI application factory, middleware, router mounts
├── run.py                   # Entrypoint script with reload configuration
├── db.py / database.py      # SQLAlchemy session factory and SQLite local store
├── models.py                # SQLAlchemy ORM models (Org, Property, Building, Unit, Asset, etc.)
├── schemas.py               # Pydantic v2 validation schemas
├── supabase_sync.py         # Live PostgREST replication bridge with deterministic UUIDv5 mapping
├── seed_supabase.py         # Supabase cloud database seeding script
├── sync_all_to_supabase.py  # One-shot migration & sync utility from local SQLite to Supabase
├── qr_utils.py              # Cryptographic Crockford-32 and Luhn check-digit helpers
├── routers/
│   ├── sync.py              # /api/sync/push and /api/sync/pull endpoints
│   ├── assets.py            # /api/assets CRUD, lookup, and status updates
│   ├── work_orders.py       # /api/work-orders queue, status transitions, SLA checks
│   ├── service.py           # /api/service-events logging and part usage tracking
│   ├── properties.py        # /api/properties, buildings, and units hierarchy
│   └── users.py             # /api/users technician and property manager rosters
└── test_*.py                # Automated pytest suite (24 tests)
```

---

## Quickstart

### 1. Activate Environment & Run Server
```bash
# Using project venv (port 8080)
.venv/bin/uvicorn backend_py.main:app --host 127.0.0.1 --port 8080 --reload
```
Interactive Swagger documentation is available at `http://localhost:8080/docs`.

### 2. Run Automated Test Suite
```bash
pytest backend_py/
```
Runs 24 unit and integration tests verifying routers, schema validation, and database operations.

### 3. Sync to Supabase PostgreSQL
```bash
python3 backend_py/sync_all_to_supabase.py
```
Synchronizes properties, buildings, units, assets, and work orders to live cloud Supabase tables with error isolation.
