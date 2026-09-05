import pytest
from backend_py.db import SessionLocal, Base, engine
from backend_py.models import (
    Organization,
    Property,
    Building,
    Unit,
    AssetCategory,
    AssetModel,
    Asset,
    WorkOrder,
    WorkOrderNote,
    ServiceEvent,
    PartRecord,
    MaintenanceUser,
    SyncBatch,
)
from backend_py.seed import seed_database


@pytest.fixture(scope="module", autouse=True)
def init_db():
    seed_database(force_reseed=True)
    yield


def test_seed_counts():
    db = SessionLocal()
    try:
        assert db.query(Organization).count() == 1
        assert db.query(Property).count() == 6
        assert db.query(Building).count() == 7
        assert db.query(Unit).count() == 12
        assert db.query(AssetCategory).count() == 7
        assert db.query(AssetModel).count() == 13
        assert db.query(Asset).count() == 13
        assert db.query(WorkOrder).count() == 16
        assert db.query(WorkOrderNote).count() == 6
        assert db.query(ServiceEvent).count() == 48
        assert db.query(PartRecord).count() == 4
        assert db.query(MaintenanceUser).count() == 5
        assert db.query(SyncBatch).count() == 1
    finally:
        db.close()


def test_organization_and_properties():
    db = SessionLocal()
    try:
        org = db.query(Organization).filter(Organization.id == "org_sonoran").first()
        assert org is not None
        assert org.name == "Sonoran Portfolio Partners LLC"
        assert org.slug == "sonoran-partners"
        assert org.plan == "Enterprise Portfolio Tier"
        assert len(org.properties) == 6

        prop_sonoran = db.query(Property).filter(Property.id == "prop_sonoran_ridge").first()
        assert prop_sonoran is not None
        assert prop_sonoran.name == "Sonoran Ridge Residences"
        assert prop_sonoran.code == "SRR"
        assert prop_sonoran.city == "Phoenix"
        assert prop_sonoran.state == "AZ"
        assert prop_sonoran.postal_code == "85018"
        assert prop_sonoran.unit_count_declared == 240
        assert prop_sonoran.latitude == 33.5092
        assert prop_sonoran.longitude == -111.9783
        assert prop_sonoran.year_built == 2018
        assert prop_sonoran.timezone == "America/Phoenix"
        assert len(prop_sonoran.buildings) == 2
        assert len(prop_sonoran.units) == 5
    finally:
        db.close()


def test_buildings_and_units():
    db = SessionLocal()
    try:
        bld_4 = db.query(Building).filter(Building.id == "bld_4").first()
        assert bld_4 is not None
        assert bld_4.name == "Building 4"
        assert bld_4.code == "B4"
        assert bld_4.floors == 4

        unit_402 = db.query(Unit).filter(Unit.id == "unit_402").first()
        assert unit_402 is not None
        assert unit_402.label == "402"
        assert unit_402.floor == 4
        assert unit_402.bedrooms == 2
        assert unit_402.bathrooms == 2.0
        assert unit_402.square_feet == 1180
        assert unit_402.occupancy_status == "occupied"
        assert unit_402.building.id == "bld_4"
        assert unit_402.property.id == "prop_sonoran_ridge"
    finally:
        db.close()


def test_assets_and_categories():
    db = SessionLocal()
    try:
        hvac = db.query(Asset).filter(Asset.id == "asset_hvac_402").first()
        assert hvac is not None
        assert hvac.npid == "NP-1M4K9X23"
        assert hvac.category.key == "hvac"
        assert hvac.manufacturer_raw == "Carrier"
        assert hvac.model_raw == "FE4ANF002"
        assert hvac.serial_number == "4821A90124"
        assert hvac.serial_confidence == "verified"
        assert hvac.status == "needs_repair"
        assert hvac.condition == "fair"
        assert hvac.purchase_cost == 3800.0
        assert hvac.expected_life_months == 120
        assert hvac.current_property.id == "prop_sonoran_ridge"
        assert hvac.current_unit.id == "unit_402"

        # Check JSON custom fields
        custom = hvac.custom_fields
        assert isinstance(custom, dict)
        assert custom["schematicKey"] == "hvac"
        assert "criticalParts" in custom
        assert len(custom["criticalParts"]) == 3

        # Check Fridge in Unit 402
        fridge = db.query(Asset).filter(Asset.id == "asset_fridge_402").first()
        assert fridge is not None
        assert fridge.npid == "NP-7K2M4QX9"
        assert fridge.category.key == "refrigeration"
        assert fridge.manufacturer_raw == "Whirlpool"

        # Check Washer, Dryer, Dishwasher, Water Heater
        washer = db.query(Asset).filter(Asset.id == "asset_washer_402").first()
        assert washer is not None
        assert washer.npid == "NP-3W9Q5R71"
        assert washer.category.key == "laundry_wash"

        dryer = db.query(Asset).filter(Asset.id == "asset_dryer_402").first()
        assert dryer is not None
        assert dryer.npid == "NP-6K8L2P44"
        assert dryer.category.key == "laundry_dry"

        dw = db.query(Asset).filter(Asset.id == "asset_dw_402").first()
        assert dw is not None
        assert dw.npid == "NP-8V3Z6K19"
        assert dw.category.key == "dishwasher"

        wh = db.query(Asset).filter(Asset.id == "asset_wh_402").first()
        assert wh is not None
        assert wh.npid == "NP-9T5L3R18"
    finally:
        db.close()


def test_work_orders_and_notes():
    db = SessionLocal()
    try:
        wo_1048 = db.query(WorkOrder).filter(WorkOrder.number == 1048).first()
        assert wo_1048 is not None
        assert wo_1048.status == "in_progress"
        assert wo_1048.priority == "urgent"
        assert wo_1048.category == "HVAC"
        assert wo_1048.asset_id == "asset_hvac_402"
        assert wo_1048.actual_cost == 38.00
        assert "MERV 11 Filter (20x25x4)" in wo_1048.parts_required
        assert len(wo_1048.notes) == 2

        # Check note types and aliases
        note1 = wo_1048.notes[0]
        assert note1.type == "note"
        assert note1.note_type == "note"
        assert "scheduled PM trigger" in note1.text
    finally:
        db.close()


def test_service_events_and_parts():
    db = SessionLocal()
    try:
        evt1 = db.query(ServiceEvent).filter(ServiceEvent.id == "evt_1").first()
        assert evt1 is not None
        assert evt1.asset_id == "asset_hvac_402"
        assert evt1.work_order_id == "wo_1048"
        assert evt1.technician_id == "mem_morales"
        assert evt1.event_type == "maintenance"
        assert evt1.symptom_codes == ["AIRFLOW_LOW"]
        assert evt1.resolution_code == "PM_PASSED"
        assert evt1.labor_minutes == 45
        assert evt1.labor_rate == 65.0
        assert evt1.total_cost == 86.75
        assert evt1.cost_borne_by == "owner"
        assert evt1.is_warranty_claim is False

        # Check part records
        cap_part = db.query(PartRecord).filter(PartRecord.id == "part_cap_1").first()
        assert cap_part is not None
        assert cap_part.label == "45/5 uF Run Capacitor"
        assert cap_part.installed_in_asset_id == "asset_hvac_402"
        assert cap_part.status == "installed"
        assert cap_part.imputed_value == 38.00
    finally:
        db.close()


def test_maintenance_users_and_sync_batches():
    db = SessionLocal()
    try:
        morales = db.query(MaintenanceUser).filter(MaintenanceUser.id == "mem_morales").first()
        assert morales is not None
        assert morales.user_id == "user_morales"
        assert morales.full_name == "Javier Morales"
        assert morales.email == "j.morales@sonoran.example"
        assert morales.role == "lead_tech"
        assert morales.hourly_labor_rate == 68.0
        assert morales.status == "active"
        assert "prop_sonoran_ridge" in morales.property_ids

        # Check sync batch
        batch = db.query(SyncBatch).filter(SyncBatch.id == "batch_initial").first()
        assert batch is not None
        assert batch.device_id == "dev_field_tablet_morales"
        assert batch.record_count == 14
        assert batch.status == "committed"
    finally:
        db.close()
