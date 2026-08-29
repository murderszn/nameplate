-- Nameplate foundation additions (b03/b04/b05).
-- Forward-only migration. The Prisma schema intentionally keeps generated
-- columns as ordinary fields because Prisma 6 cannot model stored expressions.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE SEQUENCE IF NOT EXISTS global_change_seq;

CREATE TYPE "device_platform_t" AS ENUM ('ios', 'android');
CREATE TYPE "storage_location_kind_t" AS ENUM ('shop', 'warehouse', 'vehicle', 'vendor', 'disposal', 'staging');
CREATE TYPE "asset_move_reason_t" AS ENUM ('initial_install', 'turn_replacement', 'repair_pickup', 'repair_return', 'relocation', 'storage', 'disposal', 'correction', 'discovered', 'vendor_service');
CREATE TYPE "movement_kind_t" AS ENUM ('recorded', 'inferred', 'discovered');
CREATE TYPE "confirmation_method_t" AS ENUM ('qr_scan', 'nfc_scan', 'serial_match', 'manual', 'turn_inspection', 'photo');
CREATE TYPE "scan_code_type_t" AS ENUM ('npid', 'manufacturer_serial', 'legacy', 'unknown');
CREATE TYPE "scan_resolution_t" AS ENUM ('resolved', 'not_found', 'out_of_scope', 'ambiguous');
CREATE TYPE "media_role_t" AS ENUM ('before', 'after', 'nameplate', 'damage', 'signature', 'general');
CREATE TYPE "vendor_kind_t" AS ENUM ('appliance_repair', 'hvac', 'plumbing', 'supplier', 'disposal');
CREATE TYPE "turn_type_t" AS ENUM ('move_out', 'move_in', 'annual_inspection', 'spot_audit', 'onboarding');
CREATE TYPE "turn_status_t" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE "turn_finding_t" AS ENUM ('present_ok', 'present_damaged', 'present_needs_service', 'missing', 'unexpected_found', 'not_applicable', 'inaccessible');
CREATE TYPE "turn_decision_t" AS ENUM ('none', 'repair', 'replace', 'clean', 'monitor', 'investigate');
CREATE TYPE "reconciliation_kind_t" AS ENUM ('closed_wo_late_write', 'stale_field_update', 'duplicate_asset_suspected', 'location_conflict', 'serial_collision');
CREATE TYPE "sync_op_status_t" AS ENUM ('applied', 'duplicate', 'rejected');
CREATE TYPE "metric_scope_type_t" AS ENUM ('org', 'property', 'building', 'unit', 'asset_model', 'category');
CREATE TYPE "period_grain_t" AS ENUM ('day', 'week', 'month');

CREATE TABLE "device" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "org_id" UUID NOT NULL, "user_id" UUID NOT NULL,
  "platform" "device_platform_t" NOT NULL, "model" TEXT, "os_version" TEXT, "app_version" TEXT,
  "push_token" TEXT, "last_sync_cursor" BIGINT, "last_sync_at" TIMESTAMPTZ, "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "device_pkey" PRIMARY KEY ("id"), CONSTRAINT "device_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "device_user_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE INDEX "device_org_user_idx" ON "device" ("org_id", "user_id");

CREATE TABLE "storage_location" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "org_id" UUID NOT NULL, "property_id" UUID, "name" TEXT NOT NULL,
  "kind" "storage_location_kind_t" NOT NULL, "assigned_user_id" UUID, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "storage_location_pkey" PRIMARY KEY ("id"), CONSTRAINT "storage_location_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT,
  CONSTRAINT "storage_location_property_fkey" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE RESTRICT,
  CONSTRAINT "storage_location_user_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "user_account"("id") ON DELETE SET NULL
);
CREATE INDEX "storage_location_scope_idx" ON "storage_location" ("org_id", "property_id", "kind");

CREATE TABLE "asset_location" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "org_id" UUID NOT NULL, "asset_id" UUID NOT NULL,
  "location_type" "current_location_type_t" NOT NULL, "unit_id" UUID, "storage_location_id" UUID, "vendor_id" UUID, "property_id" UUID,
  "from_ts" TIMESTAMPTZ NOT NULL, "to_ts" TIMESTAMPTZ, "move_reason" "asset_move_reason_t" NOT NULL,
  "movement_kind" "movement_kind_t" NOT NULL DEFAULT 'recorded', "confirmed_by" UUID, "confirmation_method" "confirmation_method_t",
  "scan_latitude" NUMERIC(9,6), "scan_longitude" NUMERIC(9,6), "scan_accuracy_m" NUMERIC(8,2), "work_order_id" UUID, "service_event_id" UUID, "turn_id" UUID,
  "notes" TEXT, "occurred_at" TIMESTAMPTZ NOT NULL, "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "created_by" UUID, "device_id" UUID,
  "change_seq" BIGINT NOT NULL DEFAULT nextval('global_change_seq'),
  CONSTRAINT "asset_location_pkey" PRIMARY KEY ("id"), CONSTRAINT "asset_location_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_location_asset_fkey" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_location_unit_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_location_storage_fkey" FOREIGN KEY ("storage_location_id") REFERENCES "storage_location"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_location_property_fkey" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_location_device_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE SET NULL,
  CONSTRAINT "asset_location_target_ck" CHECK (("location_type" = 'unit' AND "unit_id" IS NOT NULL AND "storage_location_id" IS NULL) OR ("location_type" = 'storage' AND "storage_location_id" IS NOT NULL AND "unit_id" IS NULL) OR ("location_type" NOT IN ('unit','storage') AND "unit_id" IS NULL AND "storage_location_id" IS NULL)),
  CONSTRAINT "asset_location_time_ck" CHECK ("to_ts" IS NULL OR "to_ts" > "from_ts")
);
CREATE INDEX "asset_location_asset_from_idx" ON "asset_location" ("asset_id", "from_ts" DESC);
CREATE INDEX "asset_location_org_property_from_idx" ON "asset_location" ("org_id", "property_id", "from_ts" DESC);
CREATE UNIQUE INDEX "asset_location_one_open_idx" ON "asset_location" ("asset_id") WHERE "to_ts" IS NULL;
ALTER TABLE "asset_location" ADD CONSTRAINT "asset_location_no_overlap_excl" EXCLUDE USING gist ("asset_id" WITH =, tstzrange("from_ts", COALESCE("to_ts", 'infinity'::timestamptz), '[)') WITH &&);

CREATE TABLE "asset_identifier_scan" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "org_id" UUID, "raw_code" TEXT NOT NULL, "code_type" "scan_code_type_t" NOT NULL,
  "resolved_asset_id" UUID, "resolution" "scan_resolution_t" NOT NULL, "scanned_by" UUID, "device_id" UUID,
  "scan_latitude" NUMERIC(9,6), "scan_longitude" NUMERIC(9,6), "expected_property_id" UUID, "actual_property_id" UUID,
  "occurred_at" TIMESTAMPTZ NOT NULL, "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "asset_identifier_scan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_identifier_scan_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE SET NULL,
  CONSTRAINT "asset_identifier_scan_asset_fkey" FOREIGN KEY ("resolved_asset_id") REFERENCES "asset"("id") ON DELETE SET NULL,
  CONSTRAINT "asset_identifier_scan_device_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE SET NULL
);
CREATE INDEX "asset_identifier_scan_asset_idx" ON "asset_identifier_scan" ("resolved_asset_id", "occurred_at" DESC);
CREATE INDEX "asset_identifier_scan_scope_idx" ON "asset_identifier_scan" ("org_id", "resolution", "occurred_at" DESC);

CREATE TABLE "media" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "org_id" UUID NOT NULL, "storage_key" TEXT NOT NULL, "mime_type" TEXT NOT NULL,
  "bytes" BIGINT, "width" INTEGER, "height" INTEGER, "sha256" TEXT, "captured_at" TIMESTAMPTZ, "captured_latitude" NUMERIC(9,6), "captured_longitude" NUMERIC(9,6),
  "uploaded_by" UUID, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "media_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "media_storage_key_key" UNIQUE ("storage_key"), CONSTRAINT "media_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT,
  CONSTRAINT "media_user_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user_account"("id") ON DELETE SET NULL
);
CREATE INDEX "media_org_sha_idx" ON "media" ("org_id", "sha256");

CREATE TABLE "media_attachment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "org_id" UUID NOT NULL, "media_id" UUID NOT NULL, "entity_type" TEXT NOT NULL, "entity_id" UUID NOT NULL,
  "role" "media_role_t" NOT NULL, "sort_order" INTEGER NOT NULL DEFAULT 0, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "created_by" UUID,
  CONSTRAINT "media_attachment_pkey" PRIMARY KEY ("id"), CONSTRAINT "media_attachment_unique" UNIQUE ("media_id", "entity_type", "entity_id", "role"),
  CONSTRAINT "media_attachment_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT,
  CONSTRAINT "media_attachment_media_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT,
  CONSTRAINT "media_attachment_user_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("id") ON DELETE SET NULL
);
CREATE INDEX "media_attachment_entity_idx" ON "media_attachment" ("org_id", "entity_type", "entity_id");

CREATE TABLE "vendor" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "org_id" UUID NOT NULL, "name" TEXT NOT NULL, "kind" "vendor_kind_t" NOT NULL,
  "contact_name" TEXT, "phone" TEXT, "email" TEXT, "hourly_rate" NUMERIC(10,2), "notes" TEXT, "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "vendor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vendor_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "vendor_active_name_idx" ON "vendor" ("org_id", lower("name")) WHERE "active";

CREATE TABLE "turn" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "org_id" UUID NOT NULL, "property_id" UUID NOT NULL, "unit_id" UUID NOT NULL, "type" "turn_type_t" NOT NULL,
  "status" "turn_status_t" NOT NULL DEFAULT 'scheduled', "scheduled_for" TIMESTAMPTZ, "started_at" TIMESTAMPTZ, "completed_at" TIMESTAMPTZ, "performed_by" UUID NOT NULL,
  "previous_tenant_ref" TEXT, "items_total" INTEGER NOT NULL DEFAULT 0, "items_present" INTEGER NOT NULL DEFAULT 0, "items_missing" INTEGER NOT NULL DEFAULT 0, "items_damaged" INTEGER NOT NULL DEFAULT 0,
  "assets_added" INTEGER NOT NULL DEFAULT 0, "assets_removed" INTEGER NOT NULL DEFAULT 0, "estimated_cost" NUMERIC(12,2), "actual_cost" NUMERIC(12,2), "notes" TEXT,
  "occurred_at" TIMESTAMPTZ, "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "deleted_at" TIMESTAMPTZ,
  "change_seq" BIGINT NOT NULL DEFAULT nextval('global_change_seq'), CONSTRAINT "turn_pkey" PRIMARY KEY ("id"), CONSTRAINT "turn_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT,
  CONSTRAINT "turn_property_fkey" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE RESTRICT, CONSTRAINT "turn_unit_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE RESTRICT
);
CREATE INDEX "turn_scope_idx" ON "turn" ("org_id", "property_id", "status");
CREATE INDEX "turn_unit_completed_idx" ON "turn" ("unit_id", "completed_at" DESC);
CREATE UNIQUE INDEX "turn_one_active_unit_idx" ON "turn" ("unit_id") WHERE "status" IN ('scheduled','in_progress') AND "deleted_at" IS NULL;

CREATE TABLE "turn_item" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "org_id" UUID NOT NULL, "turn_id" UUID NOT NULL, "asset_id" UUID, "expected_category_id" UUID,
  "finding" "turn_finding_t" NOT NULL, "condition" "asset_condition_t", "decision" "turn_decision_t" DEFAULT 'none', "decision_reason" TEXT, "estimated_cost" NUMERIC(12,2),
  "verified_by_scan" BOOLEAN NOT NULL DEFAULT false, "generated_work_order_id" UUID, "generated_asset_id" UUID, "notes" TEXT, "occurred_at" TIMESTAMPTZ NOT NULL,
  "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "created_by" UUID, "change_seq" BIGINT NOT NULL DEFAULT nextval('global_change_seq'), CONSTRAINT "turn_item_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "turn_item_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT, CONSTRAINT "turn_item_turn_fkey" FOREIGN KEY ("turn_id") REFERENCES "turn"("id") ON DELETE RESTRICT,
  CONSTRAINT "turn_item_asset_fkey" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE SET NULL, CONSTRAINT "turn_item_category_fkey" FOREIGN KEY ("expected_category_id") REFERENCES "asset_category"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "turn_item_asset_unique_idx" ON "turn_item" ("turn_id", "asset_id") WHERE "asset_id" IS NOT NULL;
CREATE INDEX "turn_item_finding_idx" ON "turn_item" ("org_id", "finding");

CREATE TABLE "reconciliation_flag" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "org_id" UUID NOT NULL, "entity_type" TEXT NOT NULL, "entity_id" UUID NOT NULL, "kind" "reconciliation_kind_t" NOT NULL,
  "detail" JSONB NOT NULL DEFAULT '{}', "raised_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "resolved_at" TIMESTAMPTZ, "resolved_by" UUID, "resolution_note" TEXT,
  CONSTRAINT "reconciliation_flag_pkey" PRIMARY KEY ("id"), CONSTRAINT "reconciliation_flag_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT,
  CONSTRAINT "reconciliation_flag_user_fkey" FOREIGN KEY ("resolved_by") REFERENCES "user_account"("id") ON DELETE SET NULL
);
CREATE INDEX "reconciliation_open_idx" ON "reconciliation_flag" ("org_id", "raised_at") WHERE "resolved_at" IS NULL;

CREATE TABLE "sync_op" (
  "op_id" UUID NOT NULL, "org_id" UUID NOT NULL, "device_id" UUID NOT NULL, "user_id" UUID, "entity_type" TEXT NOT NULL, "entity_id" UUID, "op_type" TEXT NOT NULL,
  "status" "sync_op_status_t" NOT NULL DEFAULT 'applied', "error" JSONB, "received_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "sync_op_pkey" PRIMARY KEY ("op_id"),
  CONSTRAINT "sync_op_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT, CONSTRAINT "sync_op_device_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE RESTRICT,
  CONSTRAINT "sync_op_user_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("id") ON DELETE SET NULL
);
CREATE INDEX "sync_op_org_received_idx" ON "sync_op" ("org_id", "received_at");
CREATE INDEX "sync_op_device_received_idx" ON "sync_op" ("device_id", "received_at");

CREATE TABLE "audit_log" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "org_id" UUID NOT NULL, "actor_user_id" UUID, "actor_role" "role_t", "device_id" TEXT, "ip" INET,
  "action" TEXT NOT NULL, "entity_type" TEXT NOT NULL, "entity_id" UUID, "before" JSONB, "after" JSONB, "occurred_at" TIMESTAMPTZ NOT NULL, "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id"), CONSTRAINT "audit_log_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT,
  CONSTRAINT "audit_log_user_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user_account"("id") ON DELETE SET NULL
);
CREATE INDEX "audit_log_entity_idx" ON "audit_log" ("org_id", "entity_type", "entity_id", "recorded_at" DESC);

CREATE TABLE "metric_snapshot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "org_id" UUID NOT NULL, "scope_type" "metric_scope_type_t" NOT NULL, "scope_id" UUID,
  "period_start" DATE NOT NULL, "period_grain" "period_grain_t" NOT NULL, "definition_version" INTEGER NOT NULL DEFAULT 1, "metrics" JSONB NOT NULL, "computed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "metric_snapshot_pkey" PRIMARY KEY ("id"), CONSTRAINT "metric_snapshot_org_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "metric_snapshot_natural_key" ON "metric_snapshot" ("org_id", "scope_type", COALESCE("scope_id", '00000000-0000-0000-0000-000000000000'::uuid), "period_grain", "period_start", "definition_version");

-- Generated and integrity-sensitive columns omitted by the initial scaffold.
ALTER TABLE "asset" DROP COLUMN "serial_normalized";
ALTER TABLE "asset" ADD COLUMN "serial_normalized" TEXT GENERATED ALWAYS AS (upper(regexp_replace("serial_number", '[^a-zA-Z0-9]', '', 'g'))) STORED;
ALTER TABLE "service_event" DROP COLUMN "labor_cost";
ALTER TABLE "service_event" ADD COLUMN "labor_cost" NUMERIC(12,2) GENERATED ALWAYS AS (round((COALESCE("labor_minutes", 0)::numeric / 60) * COALESCE("labor_rate", 0), 2)) STORED;
ALTER TABLE "service_event" DROP COLUMN "total_cost";
ALTER TABLE "service_event" ADD COLUMN "total_cost" NUMERIC(12,2) GENERATED ALWAYS AS (COALESCE("labor_cost", 0) + COALESCE("parts_cost", 0) + COALESCE("other_cost", 0)) STORED;
ALTER TABLE "part_usage" DROP COLUMN "total_cost";
ALTER TABLE "part_usage" ADD COLUMN "total_cost" NUMERIC(12,2) GENERATED ALWAYS AS (round("quantity" * "unit_cost", 2)) STORED;

CREATE UNIQUE INDEX "organization_active_slug_idx" ON "organization" ("slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "property_active_code_idx" ON "property" ("org_id", "code") WHERE "code" IS NOT NULL AND "deleted_at" IS NULL;
CREATE UNIQUE INDEX "building_active_name_idx" ON "building" ("property_id", "name") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "membership_active_org_user_idx" ON "membership" ("org_id", "user_id") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "assignment_active_idx" ON "property_assignment" ("membership_id", "property_id") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "asset_trusted_serial_idx" ON "asset" ("org_id", "asset_model_id", "serial_normalized") WHERE "serial_normalized" IS NOT NULL AND "serial_confidence" IN ('scanned','typed') AND "deleted_at" IS NULL;
CREATE INDEX "asset_serial_lookup_idx" ON "asset" ("serial_normalized") WHERE "serial_normalized" IS NOT NULL;
CREATE INDEX "asset_alt_identifiers_gin_idx" ON "asset" USING GIN ("alt_identifiers" jsonb_path_ops);
CREATE INDEX "asset_attention_idx" ON "asset" ("org_id", "status") WHERE "status" IN ('unaccounted_for','needs_repair','awaiting_parts');
ALTER TABLE "asset" ADD CONSTRAINT "asset_location_shape_ck" CHECK (("current_location_type" = 'unit' AND "current_unit_id" IS NOT NULL AND "current_storage_location_id" IS NULL) OR ("current_location_type" = 'storage' AND "current_storage_location_id" IS NOT NULL AND "current_unit_id" IS NULL) OR ("current_location_type" NOT IN ('unit','storage') AND "current_unit_id" IS NULL AND "current_storage_location_id" IS NULL));
ALTER TABLE "asset" ADD CONSTRAINT "asset_retired_shape_ck" CHECK ("retired_at" IS NULL OR "status" IN ('retired','disposed','salvage'));
ALTER TABLE "part" ADD CONSTRAINT "part_salvage_origin_ck" CHECK ("origin" <> 'salvaged' OR "source_asset_id" IS NOT NULL);
ALTER TABLE "service_event" ADD CONSTRAINT "service_event_clock_ck" CHECK ("occurred_at" <= "recorded_at" + interval '1 day');

CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit_log is append-only'; END; $$;
CREATE TRIGGER audit_log_immutable BEFORE UPDATE OR DELETE ON "audit_log" FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- The initial scaffold used timestamp without time zone. Existing values are
-- deterministic local-development instants and are interpreted as UTC.
ALTER TABLE "organization" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "organization" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "organization" ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "user_account" ALTER COLUMN "last_seen_at" TYPE TIMESTAMPTZ(3) USING "last_seen_at" AT TIME ZONE 'UTC';
ALTER TABLE "user_account" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "user_account" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "user_account" ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "membership" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "membership" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "membership" ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "property_assignment" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "property_assignment" ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "property" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "property" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "property" ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "building" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "building" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "building" ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "unit" ALTER COLUMN "last_turn_completed_at" TYPE TIMESTAMPTZ(3) USING "last_turn_completed_at" AT TIME ZONE 'UTC';
ALTER TABLE "unit" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "unit" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "unit" ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "asset_model" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "asset_model" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "asset" ALTER COLUMN "current_location_since" TYPE TIMESTAMPTZ(3) USING "current_location_since" AT TIME ZONE 'UTC';
ALTER TABLE "asset" ALTER COLUMN "current_location_confirmed_at" TYPE TIMESTAMPTZ(3) USING "current_location_confirmed_at" AT TIME ZONE 'UTC';
ALTER TABLE "asset" ALTER COLUMN "retired_at" TYPE TIMESTAMPTZ(3) USING "retired_at" AT TIME ZONE 'UTC';
ALTER TABLE "asset" ALTER COLUMN "last_service_at" TYPE TIMESTAMPTZ(3) USING "last_service_at" AT TIME ZONE 'UTC';
ALTER TABLE "asset" ALTER COLUMN "next_service_due_at" TYPE TIMESTAMPTZ(3) USING "next_service_due_at" AT TIME ZONE 'UTC';
ALTER TABLE "asset" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "asset" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "asset" ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "service_event" ALTER COLUMN "occurred_at" TYPE TIMESTAMPTZ(3) USING "occurred_at" AT TIME ZONE 'UTC';
ALTER TABLE "service_event" ALTER COLUMN "recorded_at" TYPE TIMESTAMPTZ(3) USING "recorded_at" AT TIME ZONE 'UTC';
ALTER TABLE "work_order" ALTER COLUMN "sla_due_at" TYPE TIMESTAMPTZ(3) USING "sla_due_at" AT TIME ZONE 'UTC';
ALTER TABLE "work_order" ALTER COLUMN "first_response_at" TYPE TIMESTAMPTZ(3) USING "first_response_at" AT TIME ZONE 'UTC';
ALTER TABLE "work_order" ALTER COLUMN "completed_at" TYPE TIMESTAMPTZ(3) USING "completed_at" AT TIME ZONE 'UTC';
ALTER TABLE "work_order" ALTER COLUMN "approved_at" TYPE TIMESTAMPTZ(3) USING "approved_at" AT TIME ZONE 'UTC';
ALTER TABLE "work_order" ALTER COLUMN "scheduled_for" TYPE TIMESTAMPTZ(3) USING "scheduled_for" AT TIME ZONE 'UTC';
ALTER TABLE "work_order" ALTER COLUMN "occurred_at" TYPE TIMESTAMPTZ(3) USING "occurred_at" AT TIME ZONE 'UTC';
ALTER TABLE "work_order" ALTER COLUMN "recorded_at" TYPE TIMESTAMPTZ(3) USING "recorded_at" AT TIME ZONE 'UTC';
ALTER TABLE "work_order" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "work_order" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "work_order" ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "part_catalog" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "part_catalog" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "part" ALTER COLUMN "salvaged_at" TYPE TIMESTAMPTZ(3) USING "salvaged_at" AT TIME ZONE 'UTC';
ALTER TABLE "part" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "part" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
ALTER TABLE "part" ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3) USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "part_usage" ALTER COLUMN "occurred_at" TYPE TIMESTAMPTZ(3) USING "occurred_at" AT TIME ZONE 'UTC';
ALTER TABLE "part_usage" ALTER COLUMN "recorded_at" TYPE TIMESTAMPTZ(3) USING "recorded_at" AT TIME ZONE 'UTC';

ALTER TABLE "user_account" ALTER COLUMN "email" TYPE CITEXT USING "email"::citext;
ALTER TABLE "asset_model" ADD COLUMN "manufacturer_normalized" TEXT GENERATED ALWAYS AS (lower(regexp_replace("manufacturer", '[^a-zA-Z0-9]', '', 'g'))) STORED;
ALTER TABLE "asset_model" ADD COLUMN "model_normalized" TEXT GENERATED ALWAYS AS (upper(regexp_replace("model_number", '[^a-zA-Z0-9]', '', 'g'))) STORED;
ALTER TABLE "part_catalog" ADD COLUMN "part_number_normalized" TEXT GENERATED ALWAYS AS (upper(regexp_replace("part_number", '[^a-zA-Z0-9]', '', 'g'))) STORED;
CREATE UNIQUE INDEX "asset_model_normalized_key" ON "asset_model" ("manufacturer_normalized", "model_normalized");
CREATE UNIQUE INDEX "part_catalog_normalized_key" ON "part_catalog" ("manufacturer", "part_number_normalized");

DROP INDEX "organization_slug_key";
DROP INDEX "membership_org_id_user_id_key";
DROP INDEX "property_assignment_membership_id_property_id_key";
