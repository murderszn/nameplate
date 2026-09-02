import json
from datetime import datetime, timezone, timedelta
from .db import SessionLocal, Base, engine
from .models import (
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
)


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Organization).first() is not None:
            print("Database already seeded.")
            return

        print("Seeding Nameplate SQLite Database...")
        now = datetime.now(timezone.utc)

        # 1. Organizations
        org = Organization(
            id="org_sonoran",
            name="Sonoran Portfolio Partners LLC",
            slug="sonoran-partners",
            plan="Enterprise Portfolio Tier",
            created_at=now - timedelta(days=365),
        )
        db.add(org)

        # 2. Properties
        prop_sonoran = Property(
            id="prop_sonoran_ridge",
            organization_id="org_sonoran",
            name="Sonoran Ridge Residences",
            code="SRR",
            address_line1="4820 E Camelback Rd",
            city="Phoenix",
            state="AZ",
            postal_code="85018",
            status="active",
            unit_count_declared=240,
            latitude=33.5092,
            longitude=-111.9783,
            year_built=2018,
            timezone="America/Phoenix",
        )
        prop_camelback = Property(
            id="prop_camelback_vista",
            organization_id="org_sonoran",
            name="Camelback Vista Apartments",
            code="CVA",
            address_line1="5110 N 44th St",
            city="Phoenix",
            state="AZ",
            postal_code="85018",
            status="active",
            unit_count_declared=180,
            latitude=33.5124,
            longitude=-111.9861,
            year_built=2020,
            timezone="America/Phoenix",
        )
        db.add_all([prop_sonoran, prop_camelback])

        # 3. Buildings & Units
        bld_a = Building(id="bld_a", property_id="prop_sonoran_ridge", name="Building A", code="BLD-A", floors=4)
        bld_b = Building(id="bld_b", property_id="prop_sonoran_ridge", name="Building B", code="BLD-B", floors=3)
        db.add_all([bld_a, bld_b])

        unit_402 = Unit(
            id="unit_402",
            property_id="prop_sonoran_ridge",
            building_id="bld_a",
            label="Unit 402",
            floor=4,
            bedrooms=2,
            bathrooms=2.0,
            square_feet=1150,
            occupancy_status="occupied",
        )
        unit_214 = Unit(
            id="unit_214",
            property_id="prop_sonoran_ridge",
            building_id="bld_a",
            label="Unit 214",
            floor=2,
            bedrooms=1,
            bathrooms=1.0,
            square_feet=820,
            occupancy_status="occupied",
        )
        unit_108 = Unit(
            id="unit_108",
            property_id="prop_sonoran_ridge",
            building_id="bld_b",
            label="Unit 108",
            floor=1,
            bedrooms=2,
            bathrooms=2.0,
            square_feet=1050,
            occupancy_status="occupied",
        )
        unit_storage = Unit(
            id="unit_storage",
            property_id="prop_sonoran_ridge",
            building_id="bld_b",
            label="Maint Storage B1",
            floor=0,
            bedrooms=0,
            bathrooms=0.0,
            square_feet=400,
            occupancy_status="storage",
        )
        db.add_all([unit_402, unit_214, unit_108, unit_storage])

        # 4. Asset Categories
        cat_hvac = AssetCategory(id="cat_hvac", key="hvac", display_name="HVAC System", default_useful_life_months=144, default_replacement_cost=3800.0)
        cat_fridge = AssetCategory(id="cat_refrigeration", key="refrigerator", display_name="Refrigerator", default_useful_life_months=120, default_replacement_cost=1450.0)
        cat_dw = AssetCategory(id="cat_dishwasher", key="dishwasher", display_name="Dishwasher", default_useful_life_months=96, default_replacement_cost=720.0)
        cat_washer = AssetCategory(id="cat_washer", key="washer", display_name="Washer / Dryer", default_useful_life_months=120, default_replacement_cost=980.0)
        cat_wh = AssetCategory(id="cat_water_heater", key="water_heater", display_name="Water Heater", default_useful_life_months=120, default_replacement_cost=1150.0)
        db.add_all([cat_hvac, cat_fridge, cat_dw, cat_washer, cat_wh])

        # 5. Asset Models
        model_carrier = AssetModel(id="model_carrier", manufacturer="Carrier", model_number="FE4ANF002", display_name="Carrier 2.5-Ton Variable Speed Air Handler", typical_replacement_cost=3850.0)
        model_whirlpool = AssetModel(id="model_whirlpool", manufacturer="Whirlpool", model_number="WRX735SDHZ", display_name="Whirlpool 25 cu. ft. French Door Refrigerator", typical_replacement_cost=1850.0)
        model_ge = AssetModel(id="model_ge", manufacturer="GE Appliances", model_number="GDF530PSMSS", display_name="GE Front Control Dishwasher", typical_replacement_cost=750.0)
        model_speedqueen = AssetModel(id="model_speedqueen", manufacturer="Speed Queen", model_number="TR7003WN", display_name="Speed Queen Commercial Homestyle Washer", typical_replacement_cost=1420.0)
        db.add_all([model_carrier, model_whirlpool, model_ge, model_speedqueen])

        # 6. Assets
        hvac_asset = Asset(
            id="asset_carrier_58sb0a",
            npid="NP-1M4K9X23",
            category_id="cat_hvac",
            asset_model_id="model_carrier",
            manufacturer_raw="Carrier",
            model_raw="FE4ANF002",
            serial_number="4821A90124",
            serial_confidence="verified",
            status="needs_repair",
            condition="fair",
            current_property_id="prop_sonoran_ridge",
            current_unit_id="unit_402",
            current_location_confirmed_at=now - timedelta(days=2),
            install_date=now - timedelta(days=365 * 3),
            manufacture_date=now - timedelta(days=365 * 4),
            warranty_expires_on=now + timedelta(days=365 * 2),
            purchase_cost=3850.0,
            expected_life_months=144,
            lifetime_service_cost=420.0,
            service_event_count=3,
            last_service_at=now - timedelta(days=12),
            notes="Variable speed blower motor showing intermittent PWM signal dropouts.",
            custom_fields_json=json.dumps({
                "schematicKey": "hvac",
                "specTag": "HVAC // BLUEPRINT",
                "room": "Utility Closet",
                "gps": "33.5094° N, 111.9781° W",
                "owner": "Sonoran Ridge LLC",
                "warrantySub": "Parts & Labor 10-Yr Registered",
                "compressorWarranty": "Active thru Oct 2028",
                "description": "2.5-Ton Multi-Poise Variable Speed Air Handler with Aluminum Coil.",
                "serialLabel": "Serial: 4821A90124 · Verified Clean",
                "criticalParts": [
                    {"type": "red", "title": "Blower Motor", "text": "ECM 2.3 Variable Speed 1/2 HP · OEM HK44EA124"},
                    {"type": "white", "title": "TXV Metering Device", "text": "Factory R-410A Hard Shutoff Thermal Expansion Valve"},
                    {"type": "white", "title": "Control Board", "text": "Carrier Infinity Integrated Microprocessor Board"}
                ]
            }),
        )

        fridge_asset = Asset(
            id="asset_fridge_whirlpool",
            npid="NP-4K8D2M7Q",
            category_id="cat_refrigeration",
            asset_model_id="model_whirlpool",
            manufacturer_raw="Whirlpool",
            model_raw="WRX735SDHZ",
            serial_number="WP-994821",
            serial_confidence="verified",
            status="active",
            condition="good",
            current_property_id="prop_sonoran_ridge",
            current_unit_id="unit_214",
            current_location_confirmed_at=now - timedelta(days=5),
            install_date=now - timedelta(days=365 * 2),
            purchase_cost=1850.0,
            expected_life_months=120,
            lifetime_service_cost=150.0,
            service_event_count=1,
            last_service_at=now - timedelta(days=45),
            notes="Gasket cleaned and evaporator fan inspected.",
            custom_fields_json=json.dumps({
                "schematicKey": "fridge",
                "specTag": "REFRIGERATION // BLUEPRINT",
                "room": "Kitchen",
                "description": "25 cu. ft. French Door Refrigerator with External Ice/Water Dispenser.",
            }),
        )

        dw_asset = Asset(
            id="asset_dw_ge",
            npid="NP-7H3P9X2C",
            category_id="cat_dishwasher",
            asset_model_id="model_ge",
            manufacturer_raw="GE Appliances",
            model_raw="GDF530PSMSS",
            serial_number="GE-772109",
            serial_confidence="verified",
            status="active",
            condition="good",
            current_property_id="prop_sonoran_ridge",
            current_unit_id="unit_214",
            current_location_confirmed_at=now - timedelta(days=1),
            install_date=now - timedelta(days=365 * 1),
            purchase_cost=750.0,
            expected_life_months=96,
            lifetime_service_cost=85.0,
            service_event_count=1,
            last_service_at=now - timedelta(days=20),
            notes="Drain pump filter cleaned.",
            custom_fields_json=json.dumps({
                "schematicKey": "dw",
                "specTag": "DISHWASHER // BLUEPRINT",
                "room": "Kitchen",
                "description": "Dry Boost Stainless Steel Interior Front-Control Dishwasher.",
            }),
        )

        donor_asset = Asset(
            id="asset_donor_carrier",
            npid="NP-9V5B1L6S",
            category_id="cat_hvac",
            asset_model_id="model_carrier",
            manufacturer_raw="Carrier",
            model_raw="FE4ANF002",
            serial_number="4819A88012",
            serial_confidence="verified",
            status="salvage",
            condition="salvage",
            current_property_id="prop_sonoran_ridge",
            current_unit_id="unit_storage",
            current_location_confirmed_at=now - timedelta(days=10),
            install_date=now - timedelta(days=365 * 5),
            purchase_cost=3400.0,
            notes="Retired unit kept in Maintenance Storage B1 for certified salvage component recovery.",
            custom_fields_json=json.dumps({
                "schematicKey": "hvac",
                "specTag": "SALVAGE // DONOR",
                "room": "Storage B1",
                "description": "Carrier air handler decommissioned with verified intact ECM module and TXV valve.",
            }),
        )

        db.add_all([hvac_asset, fridge_asset, dw_asset, donor_asset])

        # 7. Work Orders
        wo1 = WorkOrder(
            id="wo-1842",
            number=1842,
            title="Air handler blower motor vibrating & thermal tripping",
            description="Resident reports loud hum when compressor calls for cooling. Unit 402.",
            status="in_progress",
            priority="urgent",
            category="HVAC",
            property_id="prop_sonoran_ridge",
            unit_id="unit_402",
            asset_id="asset_carrier_58sb0a",
            assignee="Lead Tech Morales",
            sla_due_at=now + timedelta(hours=4),
            actual_cost=245.0,
            parts_required_json=json.dumps(["HK44EA124 ECM Motor", "Vibration Isolator Mounts"]),
        )
        wo2 = WorkOrder(
            id="wo-1839",
            number=1839,
            title="Dishwasher not draining after wash cycle",
            description="Standing water in bottom tub. Check impeller and check valve.",
            status="assigned",
            priority="normal",
            category="Appliance",
            property_id="prop_sonoran_ridge",
            unit_id="unit_214",
            asset_id="asset_dw_ge",
            assignee="Tech Chen",
            sla_due_at=now + timedelta(hours=24),
            actual_cost=0.0,
        )
        wo3 = WorkOrder(
            id="wo-1815",
            number=1815,
            title="Commercial washer door latch assembly stuck",
            description="Unit 108 laundry center. Replaced microswitch and adjusted solenoid.",
            status="completed",
            priority="normal",
            category="Appliance",
            property_id="prop_sonoran_ridge",
            unit_id="unit_108",
            assignee="Tech Davis",
            completed_at=now - timedelta(days=3),
            resolution="Replaced latch microswitch and verified safety lock cycle.",
            actual_cost=120.0,
        )
        db.add_all([wo1, wo2, wo3])

        # 8. Work Order Notes
        note1 = WorkOrderNote(
            id="note-1",
            work_order_id="wo-1842",
            author="Lead Tech Morales",
            avatar="M",
            text="Inspected ECM module. Verified 24VAC call at board, motor draws high amperage on low speed.",
            note_type="note",
            created_at=now - timedelta(hours=2),
        )
        note2 = WorkOrderNote(
            id="note-2",
            work_order_id="wo-1842",
            author="Lead Tech Morales",
            avatar="M",
            text="Harvested tested-good ECM module from donor unit NP-9V5B1L6S in Storage B1.",
            note_type="part_ordered",
            created_at=now - timedelta(hours=1),
        )
        db.add_all([note1, note2])

        # 9. Maintenance Users
        u1 = MaintenanceUser(
            id="user-morales",
            user_id="usr_morales_1",
            email="c.morales@sonoranpartners.com",
            full_name="Carlos Morales",
            phone="(602) 555-0182",
            role="lead_tech",
            employment_type="employee",
            hourly_labor_rate=65.0,
            status="active",
            last_seen_at=now - timedelta(minutes=15),
            property_ids_json=json.dumps(["prop_sonoran_ridge", "prop_camelback_vista"]),
        )
        u2 = MaintenanceUser(
            id="user-chen",
            user_id="usr_chen_2",
            email="m.chen@sonoranpartners.com",
            full_name="Maya Chen",
            phone="(602) 555-0194",
            role="technician",
            employment_type="employee",
            hourly_labor_rate=58.0,
            status="active",
            last_seen_at=now - timedelta(hours=1),
            property_ids_json=json.dumps(["prop_sonoran_ridge"]),
        )
        u3 = MaintenanceUser(
            id="user-davis",
            user_id="usr_davis_3",
            email="s.davis@sonoranpartners.com",
            full_name="Sam Davis",
            phone="(602) 555-0111",
            role="technician",
            employment_type="contractor",
            hourly_labor_rate=55.0,
            status="active",
            last_seen_at=now - timedelta(days=1),
            property_ids_json=json.dumps(["prop_sonoran_ridge", "prop_camelback_vista"]),
        )
        db.add_all([u1, u2, u3])

        # 10. Service Events
        se1 = ServiceEvent(
            id="se-1",
            asset_id="asset_carrier_58sb0a",
            work_order_id="wo-1842",
            property_id="prop_sonoran_ridge",
            unit_id="unit_402",
            technician_id="user-morales",
            event_type="repair",
            findings="Replaced blower capacitor and cleaned evaporator coil fins.",
            symptom_codes_json=json.dumps(["noisy", "not_cooling"]),
            resolution_code="fixed",
            labor_minutes=60,
            labor_rate=85.0,
            labor_cost=85.0,
            parts_cost=45.0,
            total_cost=130.0,
            occurred_at=now - timedelta(days=12),
        )
        db.add(se1)

        db.commit()
        print("Database seeded successfully with live Nameplate dataset!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
