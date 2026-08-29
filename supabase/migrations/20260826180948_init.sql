-- CreateEnum
CREATE TYPE "role_t" AS ENUM ('technician', 'lead_tech', 'property_manager', 'hq_admin', 'owner', 'viewer', 'service_account');

-- CreateEnum
CREATE TYPE "user_status_t" AS ENUM ('invited', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "membership_status_t" AS ENUM ('invited', 'active', 'revoked');

-- CreateEnum
CREATE TYPE "property_status_t" AS ENUM ('active', 'onboarding', 'inactive');

-- CreateEnum
CREATE TYPE "asset_status_t" AS ENUM ('active', 'needs_repair', 'awaiting_parts', 'in_repair', 'in_storage', 'unaccounted_for', 'retired', 'disposed', 'salvage');

-- CreateEnum
CREATE TYPE "asset_condition_t" AS ENUM ('new', 'good', 'fair', 'poor', 'failed');

-- CreateEnum
CREATE TYPE "serial_confidence_t" AS ENUM ('scanned', 'ocr', 'typed', 'illegible', 'absent');

-- CreateEnum
CREATE TYPE "current_location_type_t" AS ENUM ('unit', 'storage', 'vendor', 'in_transit', 'disposed', 'unknown');

-- CreateEnum
CREATE TYPE "service_event_type_t" AS ENUM ('inspection', 'diagnostic', 'repair', 'part_replacement', 'full_replacement', 'installation', 'removal', 'cleaning', 'preventive_maintenance', 'warranty_service', 'decommission');

-- CreateEnum
CREATE TYPE "resolution_code_t" AS ENUM ('fixed', 'part_replaced', 'asset_replaced', 'no_fault_found', 'deferred', 'needs_vendor', 'unrepairable');

-- CreateEnum
CREATE TYPE "cost_borne_by_t" AS ENUM ('owner', 'tenant', 'warranty', 'vendor', 'insurance');

-- CreateEnum
CREATE TYPE "repair_vs_replace_t" AS ENUM ('repaired', 'replaced', 'deferred');

-- CreateEnum
CREATE TYPE "part_origin_t" AS ENUM ('new_purchase', 'salvaged', 'warranty_replacement', 'vendor_supplied', 'unknown');

-- CreateEnum
CREATE TYPE "part_status_t" AS ENUM ('in_stock', 'installed', 'scrapped', 'returned', 'lost', 'reserved');

-- CreateEnum
CREATE TYPE "part_condition_t" AS ENUM ('new', 'tested_good', 'untested', 'refurbished', 'suspect');

-- CreateEnum
CREATE TYPE "component_type_t" AS ENUM ('control_board', 'compressor', 'motor', 'pump', 'heating_element', 'thermostat', 'valve', 'belt', 'door_seal', 'filter', 'sensor', 'capacitor', 'igniter', 'blower', 'fan', 'hose', 'handle', 'shelf', 'other');

-- CreateEnum
CREATE TYPE "work_order_source_t" AS ENUM ('tenant_request', 'turn_inspection', 'preventive', 'technician', 'inspection', 'system');

-- CreateEnum
CREATE TYPE "work_order_priority_t" AS ENUM ('emergency', 'urgent', 'standard', 'low');

-- CreateEnum
CREATE TYPE "work_order_status_t" AS ENUM ('open', 'assigned', 'in_progress', 'awaiting_parts', 'awaiting_approval', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "requested_action_t" AS ENUM ('diagnose', 'repair', 'replace', 'inspect', 'install', 'remove');

-- CreateEnum
CREATE TYPE "work_order_resolution_t" AS ENUM ('repaired', 'replaced', 'no_fault_found', 'deferred', 'cancelled');

-- CreateTable
CREATE TABLE "organization" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'trial',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "timezone" TEXT NOT NULL DEFAULT 'America/Phoenix',
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_account" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_media_id" UUID,
    "status" "user_status_t" NOT NULL DEFAULT 'invited',
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "role_t" NOT NULL,
    "employment_type" TEXT,
    "hourly_labor_rate" DECIMAL(10,2),
    "status" "membership_status_t" NOT NULL DEFAULT 'invited',
    "invited_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_assignment" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "property_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "country" CHAR(2) NOT NULL DEFAULT 'US',
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "timezone" TEXT,
    "unit_count_declared" INTEGER,
    "year_built" INTEGER,
    "status" "property_status_t" NOT NULL DEFAULT 'onboarding',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "change_seq" BIGSERIAL NOT NULL,

    CONSTRAINT "property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "building" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "floors" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "change_seq" BIGSERIAL NOT NULL,

    CONSTRAINT "building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "floor" INTEGER,
    "bedrooms" DECIMAL(3,1),
    "bathrooms" DECIMAL(3,1),
    "square_feet" INTEGER,
    "occupancy_status" TEXT NOT NULL DEFAULT 'vacant',
    "current_turn_id" UUID,
    "last_turn_completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "change_seq" BIGSERIAL NOT NULL,

    CONSTRAINT "unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_category" (
    "id" UUID NOT NULL,
    "org_id" UUID,
    "key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "default_useful_life_months" INTEGER NOT NULL,
    "default_replacement_cost" DECIMAL(12,2),
    "is_serialized" BOOLEAN NOT NULL DEFAULT true,
    "icon_key" TEXT,
    "sort_order" INTEGER,

    CONSTRAINT "asset_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_model" (
    "id" UUID NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model_number" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "display_name" TEXT,
    "serial_format_regex" TEXT,
    "serial_date_rule" JSONB,
    "msrp" DECIMAL(12,2),
    "typical_replacement_cost" DECIMAL(12,2),
    "expected_life_months" INTEGER,
    "spec" JSONB,
    "verification_status" TEXT NOT NULL DEFAULT 'unverified',
    "first_seen_org_id" UUID,
    "observation_count" INTEGER NOT NULL DEFAULT 1,
    "merged_into_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "npid" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "asset_model_id" UUID,
    "manufacturer_raw" TEXT,
    "model_raw" TEXT,
    "serial_number" TEXT,
    "serial_normalized" TEXT,
    "serial_confidence" "serial_confidence_t" NOT NULL DEFAULT 'absent',
    "alt_identifiers" JSONB NOT NULL DEFAULT '[]',
    "current_location_type" "current_location_type_t" NOT NULL DEFAULT 'unknown',
    "current_unit_id" UUID,
    "current_storage_location_id" UUID,
    "current_property_id" UUID,
    "current_location_since" TIMESTAMP(3),
    "current_location_confirmed_at" TIMESTAMP(3),
    "current_location_confirmed_by" UUID,
    "status" "asset_status_t" NOT NULL DEFAULT 'active',
    "condition" "asset_condition_t",
    "acquisition_type" TEXT,
    "manufacture_date" DATE,
    "manufacture_date_source" TEXT,
    "install_date" DATE,
    "install_date_confidence" TEXT,
    "warranty_expires_on" DATE,
    "purchase_cost" DECIMAL(12,2),
    "expected_life_months" INTEGER,
    "retired_at" TIMESTAMP(3),
    "retired_reason" TEXT,
    "replaced_by_asset_id" UUID,
    "replaces_asset_id" UUID,
    "lifetime_service_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "service_event_count" INTEGER NOT NULL DEFAULT 0,
    "last_service_at" TIMESTAMP(3),
    "next_service_due_at" TIMESTAMP(3),
    "notes" TEXT,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "change_seq" BIGSERIAL NOT NULL,

    CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_event" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "work_order_id" UUID,
    "turn_id" UUID,
    "unit_id" UUID,
    "property_id" UUID,
    "technician_id" UUID NOT NULL,
    "vendor_id" UUID,
    "event_type" "service_event_type_t" NOT NULL,
    "findings" TEXT,
    "symptom_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resolution_code" "resolution_code_t",
    "condition_before" "asset_condition_t",
    "condition_after" "asset_condition_t",
    "status_before" "asset_status_t",
    "status_after" "asset_status_t",
    "labor_minutes" INTEGER,
    "labor_rate" DECIMAL(10,2),
    "labor_cost" DECIMAL(12,2),
    "parts_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(12,2),
    "cost_borne_by" "cost_borne_by_t",
    "is_warranty_claim" BOOLEAN NOT NULL DEFAULT false,
    "repair_vs_replace_decision" "repair_vs_replace_t",
    "replacement_asset_id" UUID,
    "estimated_repair_cost_if_deferred" DECIMAL(12,2),
    "tenant_present" BOOLEAN,
    "follow_up_required" BOOLEAN NOT NULL DEFAULT false,
    "signature_media_id" UUID,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device_id" TEXT,
    "created_by" UUID,
    "change_seq" BIGSERIAL NOT NULL,
    "corrected_by_event_id" UUID,

    CONSTRAINT "service_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "unit_id" UUID,
    "asset_id" UUID,
    "turn_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" "work_order_source_t" NOT NULL,
    "priority" "work_order_priority_t" NOT NULL,
    "status" "work_order_status_t" NOT NULL DEFAULT 'open',
    "assigned_to" UUID,
    "requested_action" "requested_action_t",
    "resolution" "work_order_resolution_t",
    "sla_due_at" TIMESTAMP(3),
    "first_response_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "sla_met" BOOLEAN,
    "estimated_cost" DECIMAL(12,2),
    "actual_cost" DECIMAL(12,2),
    "approval_required" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "tenant_present_required" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_for" TIMESTAMP(3),
    "occurred_at" TIMESTAMP(3),
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "change_seq" BIGSERIAL NOT NULL,

    CONSTRAINT "work_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_catalog" (
    "id" UUID NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "part_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "component_type" "component_type_t" NOT NULL,
    "compatible_model_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "typical_cost" DECIMAL(12,2),
    "expected_life_months" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "part_catalog_id" UUID,
    "label" TEXT,
    "component_type" "component_type_t" NOT NULL,
    "serial_number" TEXT,
    "origin" "part_origin_t" NOT NULL DEFAULT 'unknown',
    "source_asset_id" UUID,
    "source_service_event_id" UUID,
    "salvaged_at" TIMESTAMP(3),
    "salvaged_by" UUID,
    "source_asset_age_months_at_salvage" INTEGER,
    "condition" "part_condition_t" NOT NULL DEFAULT 'untested',
    "status" "part_status_t" NOT NULL DEFAULT 'in_stock',
    "current_storage_location_id" UUID,
    "installed_in_asset_id" UUID,
    "acquisition_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "imputed_value" DECIMAL(12,2),
    "warranty_expires_on" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "change_seq" BIGSERIAL NOT NULL,

    CONSTRAINT "part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_usage" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "service_event_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "part_id" UUID,
    "part_catalog_id" UUID,
    "description" TEXT,
    "action" TEXT NOT NULL,
    "quantity" DECIMAL(8,2) NOT NULL DEFAULT 1,
    "unit_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(12,2),
    "cost_source" TEXT NOT NULL DEFAULT 'actual',
    "removed_part_id" UUID,
    "removed_part_disposition" TEXT,
    "warranty_covered" BOOLEAN NOT NULL DEFAULT false,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "change_seq" BIGSERIAL NOT NULL,

    CONSTRAINT "part_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_account_email_key" ON "user_account"("email");

-- CreateIndex
CREATE INDEX "membership_org_id_role_idx" ON "membership"("org_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "membership_org_id_user_id_key" ON "membership"("org_id", "user_id");

-- CreateIndex
CREATE INDEX "property_assignment_org_id_property_id_idx" ON "property_assignment"("org_id", "property_id");

-- CreateIndex
CREATE UNIQUE INDEX "property_assignment_membership_id_property_id_key" ON "property_assignment"("membership_id", "property_id");

-- CreateIndex
CREATE INDEX "property_org_id_status_idx" ON "property"("org_id", "status");

-- CreateIndex
CREATE INDEX "building_org_id_property_id_idx" ON "building"("org_id", "property_id");

-- CreateIndex
CREATE INDEX "unit_org_id_property_id_occupancy_status_idx" ON "unit"("org_id", "property_id", "occupancy_status");

-- CreateIndex
CREATE UNIQUE INDEX "unit_property_id_building_id_label_key" ON "unit"("property_id", "building_id", "label");

-- CreateIndex
CREATE UNIQUE INDEX "asset_model_manufacturer_model_number_key" ON "asset_model"("manufacturer", "model_number");

-- CreateIndex
CREATE UNIQUE INDEX "asset_npid_key" ON "asset"("npid");

-- CreateIndex
CREATE INDEX "asset_org_id_current_property_id_status_idx" ON "asset"("org_id", "current_property_id", "status");

-- CreateIndex
CREATE INDEX "asset_org_id_current_unit_id_idx" ON "asset"("org_id", "current_unit_id");

-- CreateIndex
CREATE INDEX "asset_org_id_status_idx" ON "asset"("org_id", "status");

-- CreateIndex
CREATE INDEX "asset_org_id_category_id_install_date_idx" ON "asset"("org_id", "category_id", "install_date");

-- CreateIndex
CREATE INDEX "asset_asset_model_id_idx" ON "asset"("asset_model_id");

-- CreateIndex
CREATE INDEX "asset_org_id_current_location_confirmed_at_idx" ON "asset"("org_id", "current_location_confirmed_at");

-- CreateIndex
CREATE INDEX "service_event_asset_id_occurred_at_idx" ON "service_event"("asset_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "service_event_org_id_occurred_at_idx" ON "service_event"("org_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "service_event_org_id_property_id_occurred_at_idx" ON "service_event"("org_id", "property_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "service_event_technician_id_occurred_at_idx" ON "service_event"("technician_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "service_event_org_id_event_type_occurred_at_idx" ON "service_event"("org_id", "event_type", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "work_order_org_id_status_sla_due_at_idx" ON "work_order"("org_id", "status", "sla_due_at");

-- CreateIndex
CREATE INDEX "work_order_org_id_assigned_to_status_idx" ON "work_order"("org_id", "assigned_to", "status");

-- CreateIndex
CREATE INDEX "work_order_asset_id_created_at_idx" ON "work_order"("asset_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "work_order_org_id_number_key" ON "work_order"("org_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "part_catalog_manufacturer_part_number_key" ON "part_catalog"("manufacturer", "part_number");

-- CreateIndex
CREATE INDEX "part_org_id_status_component_type_idx" ON "part"("org_id", "status", "component_type");

-- CreateIndex
CREATE INDEX "part_source_asset_id_idx" ON "part"("source_asset_id");

-- CreateIndex
CREATE INDEX "part_installed_in_asset_id_idx" ON "part"("installed_in_asset_id");

-- CreateIndex
CREATE INDEX "part_usage_asset_id_occurred_at_idx" ON "part_usage"("asset_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "part_usage_part_id_idx" ON "part_usage"("part_id");

-- CreateIndex
CREATE INDEX "part_usage_service_event_id_idx" ON "part_usage"("service_event_id");

-- CreateIndex
CREATE INDEX "part_usage_org_id_part_catalog_id_occurred_at_idx" ON "part_usage"("org_id", "part_catalog_id", "occurred_at" DESC);

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_assignment" ADD CONSTRAINT "property_assignment_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_assignment" ADD CONSTRAINT "property_assignment_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property" ADD CONSTRAINT "property_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "building" ADD CONSTRAINT "building_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_category" ADD CONSTRAINT "asset_category_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_asset_model_id_fkey" FOREIGN KEY ("asset_model_id") REFERENCES "asset_model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_current_unit_id_fkey" FOREIGN KEY ("current_unit_id") REFERENCES "unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_current_property_id_fkey" FOREIGN KEY ("current_property_id") REFERENCES "property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_event" ADD CONSTRAINT "service_event_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_event" ADD CONSTRAINT "service_event_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_event" ADD CONSTRAINT "service_event_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_event" ADD CONSTRAINT "service_event_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_event" ADD CONSTRAINT "service_event_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_event" ADD CONSTRAINT "service_event_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order" ADD CONSTRAINT "work_order_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part" ADD CONSTRAINT "part_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part" ADD CONSTRAINT "part_part_catalog_id_fkey" FOREIGN KEY ("part_catalog_id") REFERENCES "part_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part" ADD CONSTRAINT "part_source_asset_id_fkey" FOREIGN KEY ("source_asset_id") REFERENCES "asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part" ADD CONSTRAINT "part_installed_in_asset_id_fkey" FOREIGN KEY ("installed_in_asset_id") REFERENCES "asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_usage" ADD CONSTRAINT "part_usage_service_event_id_fkey" FOREIGN KEY ("service_event_id") REFERENCES "service_event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_usage" ADD CONSTRAINT "part_usage_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "part"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_usage" ADD CONSTRAINT "part_usage_part_catalog_id_fkey" FOREIGN KEY ("part_catalog_id") REFERENCES "part_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_usage" ADD CONSTRAINT "part_usage_removed_part_id_fkey" FOREIGN KEY ("removed_part_id") REFERENCES "part"("id") ON DELETE SET NULL ON UPDATE CASCADE;
