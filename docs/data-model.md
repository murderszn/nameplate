# Nameplate — Data Model

**Target:** PostgreSQL 16 via Prisma (see `architecture.md` §2). Written as relational tables; each maps 1:1 to a Prisma model. Where a document store would differ, it's noted.

---

## 0. Conventions

| Convention | Rule |
|---|---|
| Primary keys | `id uuid` — **UUIDv7**, time-sortable. Clients generate them offline; the server accepts client-supplied ids on create. |
| Tenancy | Every tenant table carries `org_id uuid NOT NULL REFERENCES organization(id)`, indexed, RLS-enforced. |
| Timestamps | `timestamptz` always. Two distinct concepts, never conflated: **`occurred_at`** = when the thing happened in the world (client-asserted, offline-safe) and **`recorded_at`** = when the server received it (`DEFAULT now()`, immutable). |
| Soft delete | `deleted_at timestamptz NULL`. Nothing in the ledger family is ever hard-deleted. |
| Sync cursor | Every syncable table has `change_seq bigint NOT NULL DEFAULT nextval('global_change_seq')`, bumped by trigger on UPDATE. Indexed. Drives `/v1/sync/pull`. |
| Audit stamps | `created_by uuid`, `updated_by uuid`, `device_id text NULL`. |
| Money | `numeric(12,2)` + `currency char(3) DEFAULT 'USD'`. **Never floats.** |
| Enums | Postgres native enums where the set is closed and stable; `text` + CHECK where we expect churn. |
| Naming | `snake_case` tables/columns, singular table names. |

**Global principle — facts vs. state.** Two families of tables:

- **State tables** (`asset`, `unit`, `work_order`) hold current truth and are mutable.
- **Ledger tables** (`asset_location`, `service_event`, `part_usage`, `part_movement`, `audit_log`) are **append-only**. They are never updated in place (one narrow exception: §5 correction window). Current state is always derivable from the ledgers, which means the ledgers are the real database and the state tables are a cache of the latest row. This is what makes chain of custody and repair-vs-replace economics trustworthy.

---

## 1. Organization & identity

### `organization`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text NOT NULL` | "Sunbelt Residential Partners" |
| `slug` | `text NOT NULL` | unique, URL-safe |
| `plan` | `text NOT NULL DEFAULT 'trial'` | billing tier |
| `settings` | `jsonb NOT NULL DEFAULT '{}'` | see below |
| `timezone` | `text NOT NULL DEFAULT 'America/Phoenix'` | drives SLA business-hours math |
| `currency` | `char(3) NOT NULL DEFAULT 'USD'` | |
| `created_at` `updated_at` `deleted_at` | `timestamptz` | |

`settings` jsonb holds org-tunable policy rather than columns, because these will churn:
`{ replace_threshold_pct: 60, replace_approval_limit_usd: 400, sla_hours: { emergency: 4, urgent: 24, standard: 72, low: 168 }, default_useful_life_months: {...}, require_photo_on_service: true, allow_tech_asset_create: true }`

`UNIQUE (slug) WHERE deleted_at IS NULL`

### `user_account`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | mirrors Supabase `auth.users.id` |
| `email` | `citext NOT NULL` | |
| `full_name` | `text NOT NULL` | |
| `phone` | `text NULL` | |
| `avatar_media_id` | `uuid NULL` → `media` | |
| `status` | `enum('invited','active','suspended')` | |
| `last_seen_at` | `timestamptz NULL` | |
| `created_at` `updated_at` `deleted_at` | | |

`UNIQUE (email)` globally — a user is a person, not a per-org record. Multi-org membership is below.

### `membership`

A user's role *within* an org. Enables contractors serving multiple portfolios.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `org_id` | `uuid NOT NULL` | |
| `user_id` | `uuid NOT NULL` | |
| `role` | `enum role_t` | `technician \| lead_tech \| property_manager \| hq_admin \| owner \| viewer` |
| `employment_type` | `enum('employee','contractor','vendor')` | affects labor cost defaults |
| `hourly_labor_rate` | `numeric(10,2) NULL` | for labor costing; visible only to PM+ |
| `status` | `enum('invited','active','revoked')` | |
| `invited_by` | `uuid NULL` | |
| `created_at` `updated_at` `deleted_at` | | |

`UNIQUE (org_id, user_id) WHERE deleted_at IS NULL`
`INDEX (org_id, role)`

### `property_assignment`

The scope gate. A technician sees only assigned properties (`architecture.md` §5).

| Column | Type |
|---|---|
| `id` | `uuid` PK |
| `org_id` `membership_id` `property_id` | `uuid NOT NULL` |
| `created_at` `deleted_at` | |

`UNIQUE (membership_id, property_id) WHERE deleted_at IS NULL`
`INDEX (org_id, property_id)`
Convention: `hq_admin`/`owner` have **zero** rows here and are scoped to the whole org — absence means "all," which keeps admin onboarding from requiring N inserts.

### `device`

Needed for offline attribution, sync health, and revoking a lost phone.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `org_id` `user_id` | `uuid NOT NULL` | |
| `platform` | `enum('ios','android')` | |
| `model` `os_version` `app_version` | `text` | |
| `push_token` | `text NULL` | |
| `last_sync_cursor` | `bigint NULL` | server's view of the device's watermark |
| `last_sync_at` | `timestamptz NULL` | |
| `revoked_at` | `timestamptz NULL` | |

---

## 2. Location hierarchy

Deliberately four fixed levels (`Organization → Property → Building → Unit`) rather than a generic self-referencing tree. A tree would be more flexible and much worse: every dashboard query becomes a recursive CTE, and the domain genuinely has exactly these levels. Single-building properties get one auto-created `building` named "Main" so queries never special-case.

Non-unit locations (shop, storage, truck) are modeled as **`storage_location`**, not fake units — a washer sitting in the maintenance shop is a real, common, and important state, and forcing it into a unit corrupts occupancy and cost-per-unit metrics.

### `property`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `org_id` | `uuid NOT NULL` | |
| `name` | `text NOT NULL` | "Copper Ridge Apartments" |
| `code` | `text NULL` | customer's internal ID, e.g. `CR-01` |
| `address_line1` `address_line2` `city` `state` `postal_code` | `text` | |
| `country` | `char(2) DEFAULT 'US'` | |
| `latitude` `longitude` | `numeric(9,6) NULL` | geofencing + scan-location plausibility (§9) |
| `timezone` | `text NULL` | falls back to org |
| `unit_count_declared` | `int NULL` | for coverage % ("how much of this property have we tagged?") |
| `year_built` | `int NULL` | |
| `status` | `enum('active','onboarding','inactive')` | |
| `created_at` `updated_at` `deleted_at` `change_seq` | | |

`UNIQUE (org_id, code) WHERE code IS NOT NULL AND deleted_at IS NULL`
`INDEX (org_id, status)`

### `building`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `org_id` `property_id` | `uuid NOT NULL` | |
| `name` | `text NOT NULL` | "Building C" / "Main" |
| `code` | `text NULL` | |
| `floors` | `int NULL` | |
| `created_at` `updated_at` `deleted_at` `change_seq` | | |

`UNIQUE (property_id, name) WHERE deleted_at IS NULL`
`INDEX (org_id, property_id)`

### `unit`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `org_id` `property_id` `building_id` | `uuid NOT NULL` | `property_id` denormalized from building — every asset query filters by property, and this removes a join from the hottest path in the app. Enforced consistent by trigger. |
| `label` | `text NOT NULL` | "4B", "112" |
| `floor` | `int NULL` | |
| `bedrooms` | `numeric(3,1) NULL` | `1.0`, `2.5` |
| `bathrooms` | `numeric(3,1) NULL` | |
| `square_feet` | `int NULL` | |
| `occupancy_status` | `enum('occupied','vacant','turning','offline','model')` | `turning` is set by an open Turn |
| `current_turn_id` | `uuid NULL` → `turn` | |
| `last_turn_completed_at` | `timestamptz NULL` | |
| `notes` | `text NULL` | |
| `created_at` `updated_at` `deleted_at` `change_seq` | | |

`UNIQUE (property_id, building_id, label) WHERE deleted_at IS NULL` — the practical uniqueness constraint; two buildings can each have a "101".
`INDEX (org_id, property_id, occupancy_status)`

### `storage_location`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `org_id` | `uuid NOT NULL` | |
| `property_id` | `uuid NULL` | null = org-level warehouse |
| `name` | `text NOT NULL` | "Shop — Copper Ridge", "Truck 3" |
| `kind` | `enum('shop','warehouse','vehicle','vendor','disposal','staging')` | |
| `assigned_user_id` | `uuid NULL` | for `vehicle` — whose truck |
| `created_at` `updated_at` `deleted_at` | | |

---

## 3. Asset catalog & assets

### `asset_category`

Seeded globally (`org_id NULL` = system row), extensible per org.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `org_id` | `uuid NULL` | null = system-provided |
| `key` | `text NOT NULL` | `washer`, `dryer`, `range`, `oven`, `refrigerator`, `dishwasher`, `microwave`, `water_heater`, `hvac_air_handler`, `hvac_condenser`, `furnace`, `garbage_disposal`, `range_hood`, `washer_dryer_combo`, `wall_ac`, `thermostat` |
| `display_name` | `text NOT NULL` | |
| `default_useful_life_months` | `int NOT NULL` | e.g. washer 132, water heater 120, refrigerator 156 — seeds lifespan analytics before we have our own data |
| `default_replacement_cost` | `numeric(12,2) NULL` | org-overridable |
| `is_serialized` | `bool DEFAULT true` | thermostats/disposals may be tracked non-serially |
| `icon_key` | `text` | |
| `sort_order` | `int` | |

`UNIQUE (COALESCE(org_id,'00000000-...'), key)`

### `asset_model`

**The crowd-populated asset-master catalog** (see `asset-tagging-strategy.md`). Global, cross-tenant, curated: manufacturer + model number identifies a real product in the world, and every org that encounters it enriches the same row. This shared table is a compounding data moat and the basis for cross-portfolio lifespan benchmarking.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `manufacturer` | `text NOT NULL` | normalized: `Whirlpool`, `GE`, `Frigidaire`, `LG`, `Samsung`, `Maytag`, `Amana`, `Bosch`, `Rheem`, `A.O. Smith`, `Carrier`, `Goodman`, `Trane` |
| `manufacturer_normalized` | `text` GENERATED | lower/strip — for fuzzy match, since plates read "GE Appliances", "General Electric", "G.E." |
| `model_number` | `text NOT NULL` | as printed |
| `model_normalized` | `text` GENERATED | uppercase, strip `-`/space |
| `category_id` | `uuid NOT NULL` → `asset_category` | |
| `display_name` | `text NULL` | "Whirlpool 4.5 cu ft Top-Load Washer" |
| `serial_format_regex` | `text NULL` | learned per manufacturer; powers OCR validation |
| `serial_date_rule` | `jsonb NULL` | many manufacturers encode manufacture date in the serial (Whirlpool, GE, Rheem letter/number date codes). Stored as a decode rule so we can **infer age when install date is unknown** — a genuinely high-value trick for legacy portfolios. |
| `msrp` / `typical_replacement_cost` | `numeric(12,2) NULL` | |
| `expected_life_months` | `int NULL` | overrides category default |
| `spec` | `jsonb` | capacity, fuel type, voltage, dimensions, stacked/side-by-side |
| `verification_status` | `enum('unverified','community','verified')` | `unverified` = one org typed it; `verified` = staff-curated |
| `first_seen_org_id` | `uuid NULL` | attribution/credit |
| `observation_count` | `int DEFAULT 1` | how many assets across all orgs reference it — dedupe/merge signal |
| `merged_into_id` | `uuid NULL` → self | soft-merge of duplicates; lookups follow the pointer |
| `created_at` `updated_at` | | |

`UNIQUE (manufacturer_normalized, model_normalized) WHERE merged_into_id IS NULL`
`INDEX GIN` on `(manufacturer || ' ' || model_number)` trigram, for the tech's fuzzy "I typed WTW5000DW2 but the plate says WTW5000DW-2" search.

### `asset` — the core entity

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | UUIDv7 |
| `org_id` | `uuid NOT NULL` | **the owning portfolio** |
| `npid` | `text NOT NULL` | **Nameplate ID — the primary scannable key.** Format `NP-XXXXXXXX` (Crockford base32, checksummed). Printed on our tag. Never changes for the life of the asset, across every move, org-visible. |
| `category_id` | `uuid NOT NULL` | |
| `asset_model_id` | `uuid NULL` | resolves manufacturer/model; null while unidentified |
| `manufacturer_raw` | `text NULL` | exactly as read off the plate, preserved even after model resolution |
| `model_raw` | `text NULL` | ditto |
| `serial_number` | `text NULL` | manufacturer serial, **an attribute, not the key** |
| `serial_normalized` | `text` GENERATED | uppercase, strip non-alphanumerics |
| `serial_confidence` | `enum('scanned','ocr','typed','illegible','absent')` | plates get painted over, corroded, or face a wall |
| `alt_identifiers` | `jsonb DEFAULT '[]'` | prior/legacy tags: `[{type:'legacy_sticker', value:'A-4471'}, {type:'owner_tag', value:'CR-W-112'}]` — essential for migrating a customer off spreadsheets without losing their existing labels |
| **Location (current state — mirror of latest `asset_location`)** | | |
| `current_location_type` | `enum('unit','storage','vendor','in_transit','disposed','unknown')` | |
| `current_unit_id` | `uuid NULL` → `unit` | |
| `current_storage_location_id` | `uuid NULL` → `storage_location` | |
| `current_property_id` | `uuid NULL` | denormalized for filtering |
| `current_location_since` | `timestamptz NULL` | |
| `current_location_confirmed_at` | `timestamptz NULL` | **last time a human physically laid eyes on it.** The single most important field for shrinkage. |
| `current_location_confirmed_by` | `uuid NULL` | |
| **Lifecycle** | | |
| `status` | `enum asset_status_t` | `active \| needs_repair \| awaiting_parts \| in_repair \| in_storage \| unaccounted_for \| retired \| disposed \| salvage` |
| `condition` | `enum('new','good','fair','poor','failed')` | last assessed condition |
| `acquisition_type` | `enum('new_purchase','used_purchase','inherited','transferred','unknown')` | `inherited` = came with the building; extremely common |
| `manufacture_date` | `date NULL` | decoded from serial or plate |
| `manufacture_date_source` | `enum('plate','serial_decode','estimated','unknown')` | |
| `install_date` | `date NULL` | |
| `install_date_confidence` | `enum('known','estimated','unknown')` | be honest about data quality; lifespan analytics must be able to exclude guesses |
| `warranty_expires_on` | `date NULL` | |
| `purchase_cost` | `numeric(12,2) NULL` | |
| `expected_life_months` | `int NULL` | override of model/category default |
| `retired_at` `retired_reason` | `timestamptz` / `enum('replaced','failed','disposed','sold','lost','stolen','damaged')` | |
| `replaced_by_asset_id` | `uuid NULL` → `asset` | **replacement chain** — lets us answer "the 4th washer in this unit in 6 years" |
| `replaces_asset_id` | `uuid NULL` → `asset` | inverse |
| **Denormalized rollups** (maintained by trigger/worker; never source of truth) | | |
| `lifetime_service_cost` | `numeric(12,2) DEFAULT 0` | |
| `service_event_count` | `int DEFAULT 0` | |
| `last_service_at` | `timestamptz NULL` | |
| `next_service_due_at` | `timestamptz NULL` | PM scheduling (V1) |
| `notes` | `text NULL` | |
| `custom_fields` | `jsonb DEFAULT '{}'` | customer-specific attributes without schema churn |
| `created_at` `updated_at` `deleted_at` `created_by` `updated_by` `change_seq` | | |

**Constraints & indexes — the important ones:**

```sql
-- The primary key. Globally unique; an NPID scanned anywhere resolves to exactly one asset,
-- even if the asset was sold between two orgs on our platform.
UNIQUE (npid)

-- Manufacturer serial: unique per (manufacturer, serial) but ONLY where we trust the read
-- and only within an org. Cross-org uniqueness is wrong: two portfolios can legitimately
-- hold different units whose serials collide across manufacturers, and OCR errors would
-- create false merges. Nulls and illegible reads are excluded so a wall of unreadable
-- plates doesn't block data entry.
UNIQUE (org_id, asset_model_id, serial_normalized)
  WHERE serial_normalized IS NOT NULL
    AND serial_confidence IN ('scanned','typed')
    AND deleted_at IS NULL;

-- Soft duplicate detection across orgs (theft/resale signal), not a constraint:
INDEX (serial_normalized) WHERE serial_normalized IS NOT NULL;

INDEX (org_id, current_property_id, status);
INDEX (org_id, current_unit_id) WHERE deleted_at IS NULL;
INDEX (org_id, status) WHERE status IN ('unaccounted_for','needs_repair','awaiting_parts');
INDEX (org_id, category_id, install_date);        -- lifespan cohorts
INDEX (asset_model_id);                           -- cross-org model analytics
INDEX (org_id, current_location_confirmed_at);    -- "not seen in N days" shrinkage sweep
INDEX GIN (alt_identifiers jsonb_path_ops);       -- legacy tag lookup

CHECK (
  (current_location_type = 'unit'    AND current_unit_id IS NOT NULL AND current_storage_location_id IS NULL) OR
  (current_location_type = 'storage' AND current_storage_location_id IS NOT NULL AND current_unit_id IS NULL) OR
  (current_location_type NOT IN ('unit','storage') AND current_unit_id IS NULL AND current_storage_location_id IS NULL)
);
CHECK (retired_at IS NULL OR status IN ('retired','disposed','salvage'));
```

> **Design note — why NPID and not the serial.** Making the manufacturer serial the primary key looks tempting and fails in the field for five reasons: (1) plates are unreadable on ~15–30% of installed base (rust, paint, facing a wall, behind a stacked dryer); (2) serial formats are wildly inconsistent across manufacturers and no universal registry exists; (3) OCR/manual entry errors would corrupt the primary key; (4) some categories have no serial at all; (5) a serial identifies a *product instance from the factory*, but we need to identify *a thing we are responsible for*, which is a different concept and must exist before the serial is ever read. NPID is minted the moment a tech creates the record — even with zero other data — and the serial is enriched later. See `asset-tagging-strategy.md`.

### `asset_location` — the chain-of-custody ledger

**Append-only.** This table *is* the anti-theft feature.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `org_id` `asset_id` | `uuid NOT NULL` | |
| `location_type` | `enum` | as above |
| `unit_id` / `storage_location_id` / `vendor_id` | `uuid NULL` | |
| `property_id` | `uuid NULL` | denormalized |
| `from_ts` | `timestamptz NOT NULL` | |
| `to_ts` | `timestamptz NULL` | null = current. Set when the next row opens. |
| `move_reason` | `enum('initial_install','turn_replacement','repair_pickup','repair_return','relocation','storage','disposal','correction','discovered','vendor_service')` | |
| `movement_kind` | `enum('recorded','inferred','discovered')` | `inferred` = we deduced the move from a scan elsewhere rather than someone logging it; `discovered` = found somewhere unexpected. Both are shrinkage inputs. |
| `confirmed_by` | `uuid NULL` | who physically verified |
| `confirmation_method` | `enum('qr_scan','nfc_scan','serial_match','manual','turn_inspection','photo')` | scan > manual for trust weighting |
| `scan_latitude` `scan_longitude` `scan_accuracy_m` | `numeric NULL` | captured on scan when permitted |
| `work_order_id` / `service_event_id` / `turn_id` | `uuid NULL` | provenance of the move |
| `notes` | `text NULL` | |
| `occurred_at` `recorded_at` `created_by` `device_id` `change_seq` | | |

```sql
INDEX (asset_id, from_ts DESC);
INDEX (org_id, property_id, from_ts DESC);
UNIQUE (asset_id) WHERE to_ts IS NULL;   -- exactly one open location per asset
-- Stronger, optional: EXCLUDE USING gist (asset_id WITH =, tstzrange(from_ts,to_ts) WITH &&)
--   → an asset can never be in two places at once, enforced by the database.
```

No UPDATE except closing `to_ts`. Corrections are new rows with `move_reason='correction'`, so a manipulated history is itself visible in the history.

### `asset_identifier_scan` — every scan, resolved or not

Cheap to write, invaluable for detection. Includes scans of NPIDs **not in the scanner's scope** (a tech finds a washer at a property they aren't assigned to — the exact signature of a walked-off asset).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `org_id` | `uuid NULL` | null if the scanning user's org doesn't own it |
| `raw_code` | `text NOT NULL` | |
| `code_type` | `enum('npid','manufacturer_serial','legacy','unknown')` | |
| `resolved_asset_id` | `uuid NULL` | |
| `resolution` | `enum('resolved','not_found','out_of_scope','ambiguous')` | |
| `scanned_by` `device_id` | | |
| `scan_latitude` `scan_longitude` | `numeric NULL` | |
| `expected_property_id` / `actual_property_id` | `uuid NULL` | mismatch = signal |
| `occurred_at` `recorded_at` | | |

`INDEX (resolved_asset_id, occurred_at DESC)`, `INDEX (org_id, resolution, occurred_at DESC)`

---

## 4. Service, work orders, turns

### `work_order`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `org_id` `property_id` | `uuid NOT NULL` | |
| `number` | `int NOT NULL` | human-facing, per-org sequence: `WO-1042` |
| `unit_id` / `asset_id` | `uuid NULL` | either or both; some WOs are unit-level ("check all appliances") |
| `turn_id` | `uuid NULL` | if generated by a turn |
| `title` | `text NOT NULL` | |
| `description` | `text NULL` | |
| `source` | `enum('tenant_request','turn_inspection','preventive','technician','inspection','system')` | |
| `priority` | `enum('emergency','urgent','standard','low')` | drives SLA |
| `status` | `enum('open','assigned','in_progress','awaiting_parts','awaiting_approval','completed','cancelled')` | transitions validated server-side |
| `assigned_to` | `uuid NULL` → membership | |
| `requested_action` | `enum('diagnose','repair','replace','inspect','install','remove')` | |
| `resolution` | `enum('repaired','replaced','no_fault_found','deferred','cancelled') NULL` | **the repair-vs-replace outcome field** |
| `sla_due_at` | `timestamptz NULL` | computed at creation from org SLA policy + business hours |
| `first_response_at` | `timestamptz NULL` | first status change to `in_progress` |
| `completed_at` | `timestamptz NULL` | |
| `sla_met` | `bool NULL` | materialized at close |
| `estimated_cost` `actual_cost` | `numeric(12,2) NULL` | actual rolled up from service events |
| `approval_required` `approved_by` `approved_at` | `bool` / `uuid` / `timestamptz` | for replacements over threshold |
| `tenant_present_required` | `bool DEFAULT false` | scheduling reality |
| `scheduled_for` | `timestamptz NULL` | |
| `occurred_at` `recorded_at` `created_at` `updated_at` `deleted_at` `created_by` `change_seq` | | |

`UNIQUE (org_id, number)`
`INDEX (org_id, status, sla_due_at)` — the HQ queue
`INDEX (org_id, assigned_to, status)` — the tech's queue
`INDEX (asset_id, created_at DESC)`

### `service_event` — append-only

The atomic record of "a human touched this asset."

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | UUIDv7, client-generated offline |
| `org_id` `asset_id` | `uuid NOT NULL` | |
| `work_order_id` | `uuid NULL` | not all service is ticketed |
| `turn_id` | `uuid NULL` | |
| `unit_id` `property_id` | `uuid NULL` | **snapshotted at time of service** — where it was serviced, which may differ from where it is now. Never re-derive from the asset. |
| `technician_id` | `uuid NOT NULL` → membership | |
| `vendor_id` | `uuid NULL` | external contractor |
| `event_type` | `enum('inspection','diagnostic','repair','part_replacement','full_replacement','installation','removal','cleaning','preventive_maintenance','warranty_service','decommission')` | |
| `findings` | `text NULL` | free text — "not draining, pump seized" |
| `symptom_codes` | `text[] DEFAULT '{}'` | controlled vocabulary for analytics: `no_heat`, `wont_drain`, `leaking`, `no_power`, `noisy`, `not_cooling`, `door_seal`, `control_failure`. Free text is for humans; codes are for models. |
| `resolution_code` | `enum('fixed','part_replaced','asset_replaced','no_fault_found','deferred','needs_vendor','unrepairable')` | |
| `condition_before` / `condition_after` | `enum('new','good','fair','poor','failed') NULL` | |
| `status_before` / `status_after` | `enum asset_status_t NULL` | |
| `labor_minutes` | `int NULL` | |
| `labor_rate` | `numeric(10,2) NULL` | snapshotted from membership at time of service |
| `labor_cost` | `numeric(12,2)` GENERATED | `labor_minutes/60 * labor_rate` |
| `parts_cost` | `numeric(12,2) DEFAULT 0` | rolled up from `part_usage` |
| `other_cost` | `numeric(12,2) DEFAULT 0` | trip charge, disposal fee |
| `total_cost` | `numeric(12,2)` GENERATED | sum of the three |
| `cost_borne_by` | `enum('owner','tenant','warranty','vendor','insurance')` | materially changes cost-per-unit reporting |
| `is_warranty_claim` | `bool DEFAULT false` | |
| `repair_vs_replace_decision` | `enum('repaired','replaced','deferred') NULL` | |
| `replacement_asset_id` | `uuid NULL` | if `full_replacement` |
| `estimated_repair_cost_if_deferred` | `numeric(12,2) NULL` | what we chose *not* to spend — feeds decision-quality analysis |
| `tenant_present` | `bool NULL` | |
| `follow_up_required` | `bool DEFAULT false` | |
| `signature_media_id` | `uuid NULL` | |
| `occurred_at` | `timestamptz NOT NULL` | tech-asserted, offline-safe |
| `recorded_at` | `timestamptz NOT NULL DEFAULT now()` | |
| `device_id` `created_by` `change_seq` | | |
| `corrected_by_event_id` | `uuid NULL` | see §5 |

```sql
INDEX (asset_id, occurred_at DESC);           -- the asset history timeline (hottest read)
INDEX (org_id, occurred_at DESC);
INDEX (org_id, property_id, occurred_at DESC);
INDEX (technician_id, occurred_at DESC);
INDEX (org_id, event_type, occurred_at DESC);
INDEX GIN (symptom_codes);
CHECK (occurred_at <= recorded_at + interval '1 day')  -- clock-skew sanity
```

### `service_event_media`, `media`

`media`: `id, org_id, storage_key, mime_type, bytes, width, height, sha256, captured_at, captured_lat/lng, uploaded_by, created_at`. Polymorphic attachment via `media_attachment (media_id, entity_type, entity_id, role enum('before','after','nameplate','damage','signature','general'), sort_order)`.

`role='nameplate'` matters: it's the photo of the physical data plate, retained as evidence for serial/model claims and as OCR training data.

---

## 5. Parts & lineage

The differentiator: *"the control board in unit 12C's fridge came out of unit 4B's dead fridge on March 3rd."* Modeled as **`part` (a physical object) + `part_usage` (an installation event)**, not as a line item on an invoice.

### `part_catalog`

The kind-of-thing. Shared cross-org like `asset_model`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `manufacturer` `part_number` | `text NOT NULL` | |
| `part_number_normalized` | `text` GENERATED | |
| `name` | `text NOT NULL` | "Refrigerator main control board" |
| `component_type` | `enum('control_board','compressor','motor','pump','heating_element','thermostat','valve','belt','door_seal','filter','sensor','capacitor','igniter','blower','fan','hose','handle','shelf','other')` | |
| `compatible_model_ids` | `uuid[]` | which `asset_model`s it fits — grows as techs record usage |
| `typical_cost` | `numeric(12,2) NULL` | |
| `expected_life_months` | `int NULL` | |
| `created_at` `updated_at` | | |

`UNIQUE (manufacturer, part_number_normalized)`

### `part` — a specific physical part instance

Only instantiated for parts worth tracing: salvaged parts, high-value parts, and warrantied parts. A $4 door seal from the truck doesn't need an instance row (it's recorded on `part_usage` as a consumable). **Rule: if it came out of another asset, it gets a `part` row.**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `org_id` | `uuid NOT NULL` | |
| `part_catalog_id` | `uuid NULL` | |
| `label` | `text NULL` | tech's description if uncatalogued |
| `component_type` | `enum` | |
| `serial_number` | `text NULL` | some components carry their own |
| `origin` | `enum('new_purchase','salvaged','warranty_replacement','vendor_supplied','unknown')` | |
| **`source_asset_id`** | `uuid NULL` → `asset` | **the lineage link — which asset it was pulled from** |
| `source_service_event_id` | `uuid NULL` | the removal event |
| `salvaged_at` | `timestamptz NULL` | |
| `salvaged_by` | `uuid NULL` | |
| `source_asset_age_months_at_salvage` | `int NULL` | snapshotted — a board out of a 2-year-old fridge is a different asset than one out of a 14-year-old fridge |
| `condition` | `enum('new','tested_good','untested','refurbished','suspect')` | |
| `status` | `enum('in_stock','installed','scrapped','returned','lost','reserved')` | |
| `current_storage_location_id` | `uuid NULL` | where the salvaged part physically sits |
| `installed_in_asset_id` | `uuid NULL` | current home, if installed |
| `acquisition_cost` | `numeric(12,2) DEFAULT 0` | **salvaged parts cost $0 in cash but not $0 in value** |
| `imputed_value` | `numeric(12,2) NULL` | new-part cost avoided — feeds the "parts reuse savings" metric |
| `warranty_expires_on` | `date NULL` | |
| `notes` | `text NULL` | |
| `created_at` `updated_at` `deleted_at` `change_seq` | | |

```sql
INDEX (org_id, status, component_type);
INDEX (source_asset_id);            -- "what was harvested from this asset?"
INDEX (installed_in_asset_id);      -- "what's inside this asset?"
CHECK (origin <> 'salvaged' OR source_asset_id IS NOT NULL);
```

### `part_usage` — append-only installation/removal record

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `org_id` `service_event_id` `asset_id` | `uuid NOT NULL` | |
| `part_id` | `uuid NULL` | traced instance |
| `part_catalog_id` | `uuid NULL` | consumables without an instance |
| `description` | `text NULL` | uncatalogued |
| `action` | `enum('installed','removed','swapped','tested','returned')` | |
| `quantity` | `numeric(8,2) DEFAULT 1` | |
| `unit_cost` | `numeric(12,2) DEFAULT 0` | |
| `total_cost` | `numeric(12,2)` GENERATED | |
| `cost_source` | `enum('actual','catalog_estimate','zero_salvaged')` | honesty about estimate quality |
| `removed_part_id` | `uuid NULL` → `part` | on a swap, what came out (which may then be salvaged into stock) |
| `removed_part_disposition` | `enum('scrapped','stocked','returned_warranty','vendor_core_return','unknown') NULL` | |
| `warranty_covered` | `bool DEFAULT false` | |
| `occurred_at` `recorded_at` `created_by` `change_seq` | | |

`INDEX (asset_id, occurred_at DESC)`, `INDEX (part_id)`, `INDEX (service_event_id)`, `INDEX (org_id, part_catalog_id, occurred_at DESC)`

### `part_movement` (V1)

Full custody ledger for parts, mirroring `asset_location`. Deferred: for V0, `part.status` + `part_usage` history is sufficient traceability.

**Lineage query it all exists to serve:**
> Given `part.id`, walk `source_asset_id` → that asset's `service_event` at `source_service_event_id` → its unit → and forward through `part_usage` to `installed_in_asset_id` → its current unit.
> Renders in the app as: *"Control board — salvaged 2026-03-03 from Fridge NP-7K2M4QX9 (Unit 4B, failed compressor, 11 yrs old) → installed 2026-03-09 in Fridge NP-9P4T2WB1 (Unit 12C). Avoided cost: $215."*

---

## 6. Turns (inspection workflow)

### `turn`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `org_id` `property_id` `unit_id` | `uuid NOT NULL` | |
| `type` | `enum('move_out','move_in','annual_inspection','spot_audit','onboarding')` | `onboarding` = first-ever inventory of a unit; `spot_audit` = HQ-requested verification sweep |
| `status` | `enum('scheduled','in_progress','completed','cancelled')` | |
| `scheduled_for` | `timestamptz NULL` | |
| `started_at` `completed_at` | `timestamptz NULL` | |
| `performed_by` | `uuid NOT NULL` | |
| `previous_tenant_ref` | `text NULL` | opaque reference, no PII stored |
| `items_total` `items_present` `items_missing` `items_damaged` | `int DEFAULT 0` | materialized on completion |
| `assets_added` `assets_removed` | `int DEFAULT 0` | |
| `estimated_cost` `actual_cost` | `numeric(12,2) NULL` | |
| `notes` | `text NULL` | |
| `occurred_at` `recorded_at` `created_at` `updated_at` `change_seq` | | |

`INDEX (org_id, property_id, status)`, `INDEX (unit_id, completed_at DESC)`

### `turn_item`

Server generates one row per asset currently assigned to the unit when the turn starts — so the tech's checklist *is* the expected asset roster, and any gap is immediately visible.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `org_id` `turn_id` | `uuid NOT NULL` | |
| `asset_id` | `uuid NULL` | null when the tech finds an **untagged** asset (very common on first pass) |
| `expected_category_id` | `uuid NULL` | |
| `finding` | `enum('present_ok','present_damaged','present_needs_service','missing','unexpected_found','not_applicable','inaccessible')` | |
| `condition` | `enum('new','good','fair','poor','failed') NULL` | |
| `decision` | `enum('none','repair','replace','clean','monitor','investigate') NULL` | **the repair-or-replace trigger** |
| `decision_reason` | `text NULL` | |
| `estimated_cost` | `numeric(12,2) NULL` | |
| `verified_by_scan` | `bool DEFAULT false` | scanned vs. eyeballed — trust weighting for shrinkage |
| `generated_work_order_id` | `uuid NULL` | |
| `generated_asset_id` | `uuid NULL` | if `unexpected_found` produced a new asset record |
| `notes` | `text NULL` | |
| `occurred_at` `recorded_at` `created_by` `change_seq` | | |

`UNIQUE (turn_id, asset_id) WHERE asset_id IS NOT NULL`
`INDEX (org_id, finding)` — portfolio-wide "everything found missing this month"

A `finding='missing'` **does not** immediately mark the asset stolen. It sets `asset.status='unaccounted_for'`, opens an investigation work order, and starts a clock. If the asset is scanned elsewhere within the grace window (org setting, default 30 days), the system auto-resolves it as a relocation (`asset_location` row with `movement_kind='inferred'`) and closes the investigation. Only unresolved cases escalate. This single rule is what keeps the shrinkage feature from crying wolf.

---

## 7. Supporting tables

### `vendor`
`id, org_id, name, kind enum('appliance_repair','hvac','plumbing','supplier','disposal'), contact_name, phone, email, hourly_rate, notes, active, created_at`

### `reconciliation_flag`
Offline sync conflicts needing a human (`architecture.md` §4.3).
`id, org_id, entity_type, entity_id, kind enum('closed_wo_late_write','stale_field_update','duplicate_asset_suspected','location_conflict','serial_collision'), detail jsonb, raised_at, resolved_at, resolved_by, resolution_note`
`INDEX (org_id, resolved_at) WHERE resolved_at IS NULL`

### `audit_log`
Append-only, monthly partitions, no UPDATE/DELETE grant to the app role.
`id, org_id, actor_user_id, actor_role, device_id, ip inet, action text, entity_type, entity_id, before jsonb, after jsonb, occurred_at, recorded_at`
`INDEX (org_id, entity_type, entity_id, recorded_at DESC)`

### `sync_op`
Server-side idempotency record for the outbox. `op_id uuid PK, org_id, device_id, user_id, entity_type, entity_id, op_type, status, error jsonb, received_at`. TTL 30 days.

### `metric_snapshot`
Nightly materialized rollups for HQ dashboards (`metrics.md`).
`id, org_id, scope_type enum('org','property','building','unit','asset_model','category'), scope_id, period_start date, period_grain enum('day','week','month'), metrics jsonb, computed_at`
`UNIQUE (org_id, scope_type, scope_id, period_grain, period_start)`

---

## 8. Correction & immutability policy

Append-only tables cannot be edited, but techs make mistakes. The rule:

- **Within 24h, by the author:** a `service_event` may be superseded. The original row stays; a new row is written and the original gets `corrected_by_event_id` set (the *only* permitted UPDATE, enforced by a `BEFORE UPDATE` trigger restricting the column set). Reporting queries filter `WHERE corrected_by_event_id IS NULL`.
- **After 24h, or by anyone else:** correction requires `lead_tech`+, produces a new event with `event_type` unchanged and a mandatory `findings` note, and is surfaced in the asset timeline as a visible amendment.
- **`asset_location` is never corrected**, only appended to with `move_reason='correction'`.
- **`audit_log` is never touched.**

Reason: the customer's trust in this data is the product. A record that can be quietly rewritten is worth nothing in a dispute about a missing $900 refrigerator.

---

## 9. Chain-of-custody & shrinkage: how the schema supports it

The detection surface is built from five schema decisions, none of which is a separate "anti-theft feature":

1. **`asset_location` is append-only with `to_ts` closure and a one-open-row constraint** — the location history cannot have gaps or overlaps, so "where was it on March 3rd" is always answerable and always defensible.
2. **`asset.current_location_confirmed_at` + `confirmation_method`** — distinguishes *believed* location from *verified* location. The core shrinkage query is `WHERE current_location_confirmed_at < now() - interval '180 days' AND status = 'active'`: assets nobody has physically seen in six months. Most shrinkage is discovered here, not at a turn.
3. **`asset_identifier_scan` captures out-of-scope and unresolved scans** — an NPID scanned at a property that doesn't own it produces `resolution='out_of_scope'` with `expected_property_id <> actual_property_id`. That's the *reappearance* half of "vanish or reappear elsewhere," and it works even across customer orgs because NPID is globally unique.
4. **`turn_item.finding` + the 30-day grace window** — turnover is the highest-signal audit moment, and the grace window converts most "missing" findings into recorded relocations instead of false accusations.
5. **`serial_normalized` indexed globally without a cross-org unique constraint** — lets us *detect* the same manufacturer serial appearing under two orgs (a strong resale/theft signal, surfaced to staff, never auto-accused) without letting an OCR typo block a tech's data entry.

Scoring model and thresholds live in `metrics.md` §3.2.

---

## 10. Prisma / document-store notes

**Prisma specifics:** `serial_normalized`, `labor_cost`, `total_cost`, and the `*_normalized` columns are Postgres `GENERATED ALWAYS AS ... STORED` columns declared via `@@map`/raw migration, since Prisma doesn't model generated columns natively — declare them as read-only fields and add them in a hand-edited migration. Partial unique indexes and the `EXCLUDE` constraint likewise require raw SQL in the migration file. All enums are native Postgres enums.

**If this were MongoDB instead** (it isn't — see `architecture.md` §2): `organization`/`property`/`building`/`unit` collapse into one nested document; `asset` stays its own collection with a denormalized location subdocument; `asset_location`, `service_event`, and `part_usage` remain separate collections because they're unbounded and independently queried (embedding them would blow the 16MB document limit on a 15-year-old asset and make cross-asset part lineage impossible). Every uniqueness constraint above becomes a partial unique index; every foreign key becomes an unenforced convention; every `GENERATED` column becomes application code; and the transactional guarantee in §5 (event + usages + status change) requires an explicit multi-document transaction. That list is precisely the argument for Postgres.
