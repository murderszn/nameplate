import datetime
import json
import os
import urllib.request
import uuid

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://aifsfmvvcnxowmbuorbx.supabase.co").rstrip("/")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
ORG_ID = "01919cf6-928d-787c-8067-27b686ba9374"
NAMESPACE = uuid.NAMESPACE_DNS

def to_uuid(s):
    try:
        return str(uuid.UUID(s))
    except ValueError:
        return str(uuid.uuid5(NAMESPACE, s))

def post_table(table, items):
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict=id"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }
    req = urllib.request.Request(url, data=json.dumps(items).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[{table}] Successfully synced {len(data)} rows.")
            return data
    except urllib.error.HTTPError as e:
        print(f"[{table}] Error {e.code}: {e.read().decode('utf-8')}")
        return None

now = datetime.datetime.now(datetime.timezone.utc).isoformat()

# 1. Users
users = [
    {"id": to_uuid("user_morales"), "email": "j.morales@sonoran.example", "full_name": "Javier Morales", "status": "active", "created_at": now, "updated_at": now},
    {"id": to_uuid("user_vance"), "email": "d.vance@sonoran.example", "full_name": "Danielle Vance", "status": "active", "created_at": now, "updated_at": now},
    {"id": to_uuid("user_nguyen"), "email": "m.nguyen@sonoran.example", "full_name": "Marcus Nguyen", "status": "active", "created_at": now, "updated_at": now},
]
post_table("user_account", users)

# 2. Categories
categories = [
    {"id": to_uuid("cat_refrigerator"), "key": "refrigerator", "display_name": "Refrigerator", "default_useful_life_months": 156, "default_replacement_cost": 1250.0},
    {"id": to_uuid("cat_hvac"), "key": "hvac", "display_name": "HVAC System", "default_useful_life_months": 216, "default_replacement_cost": 4200.0},
    {"id": to_uuid("cat_washer"), "key": "washer", "display_name": "Washing Machine", "default_useful_life_months": 132, "default_replacement_cost": 850.0},
    {"id": to_uuid("cat_dryer"), "key": "dryer", "display_name": "Clothes Dryer", "default_useful_life_months": 144, "default_replacement_cost": 750.0},
    {"id": to_uuid("cat_dishwasher"), "key": "dishwasher", "display_name": "Dishwasher", "default_useful_life_months": 120, "default_replacement_cost": 650.0},
    {"id": to_uuid("cat_range"), "key": "range", "display_name": "Range & Oven", "default_useful_life_months": 180, "default_replacement_cost": 950.0},
    {"id": to_uuid("cat_water_heater"), "key": "water_heater", "display_name": "Water Heater", "default_useful_life_months": 120, "default_replacement_cost": 1100.0},
    {"id": to_uuid("cat_microwave"), "key": "microwave", "display_name": "Microwave", "default_useful_life_months": 108, "default_replacement_cost": 320.0},
    {"id": to_uuid("cat_thermostat"), "key": "thermostat", "display_name": "Thermostat", "default_useful_life_months": 84, "default_replacement_cost": 220.0},
]
post_table("asset_category", categories)

# 3. Properties
properties = [
    {
        "id": to_uuid("prop_sonoran_ridge"),
        "org_id": ORG_ID,
        "name": "Sonoran Ridge Residences",
        "code": "SRR",
        "address_line1": "4820 E Camelback Rd",
        "city": "Phoenix",
        "state": "AZ",
        "postal_code": "85018",
        "status": "active",
        "unit_count_declared": 240,
        "latitude": 33.5092,
        "longitude": -111.9783,
        "year_built": 2018,
        "timezone": "America/Phoenix",
        "created_at": now,
        "updated_at": now,
    },
    {
        "id": to_uuid("prop_camelback"),
        "org_id": ORG_ID,
        "name": "Camelback View Apartments",
        "code": "CVA",
        "address_line1": "2201 E Highland Ave",
        "city": "Phoenix",
        "state": "AZ",
        "postal_code": "85016",
        "status": "active",
        "unit_count_declared": 180,
        "latitude": 33.5034,
        "longitude": -112.0341,
        "year_built": 2015,
        "timezone": "America/Phoenix",
        "created_at": now,
        "updated_at": now,
    },
    {
        "id": to_uuid("prop_scottsdale"),
        "org_id": ORG_ID,
        "name": "Scottsdale Vista",
        "code": "SVA",
        "address_line1": "7301 E Indian School Rd",
        "city": "Scottsdale",
        "state": "AZ",
        "postal_code": "85251",
        "status": "active",
        "unit_count_declared": 312,
        "latitude": 33.4942,
        "longitude": -111.9261,
        "year_built": 2021,
        "timezone": "America/Phoenix",
        "created_at": now,
        "updated_at": now,
    },
]
post_table("property", properties)

# 4. Buildings
buildings = [
    {"id": to_uuid("bld_sr_main"), "org_id": ORG_ID, "property_id": to_uuid("prop_sonoran_ridge"), "name": "Building C", "code": "BLD-C", "floors": 4, "created_at": now, "updated_at": now},
    {"id": to_uuid("bld_cb_main"), "org_id": ORG_ID, "property_id": to_uuid("prop_camelback"), "name": "Highland Tower", "code": "BLD-H", "floors": 5, "created_at": now, "updated_at": now},
    {"id": to_uuid("bld_sv_main"), "org_id": ORG_ID, "property_id": to_uuid("prop_scottsdale"), "name": "Vista Pavilion", "code": "BLD-V", "floors": 3, "created_at": now, "updated_at": now},
]
post_table("building", buildings)

# 5. Units
units = [
    {"id": to_uuid("unit-4b"), "org_id": ORG_ID, "property_id": to_uuid("prop_sonoran_ridge"), "building_id": to_uuid("bld_sr_main"), "label": "Unit 4B", "floor": 4, "bedrooms": 2, "bathrooms": 2, "square_feet": 1150, "occupancy_status": "occupied", "created_at": now, "updated_at": now},
    {"id": to_uuid("unit-12c"), "org_id": ORG_ID, "property_id": to_uuid("prop_camelback"), "building_id": to_uuid("bld_cb_main"), "label": "Unit 12C", "floor": 1, "bedrooms": 1, "bathrooms": 1, "square_feet": 820, "occupancy_status": "occupied", "created_at": now, "updated_at": now},
    {"id": to_uuid("unit-214"), "org_id": ORG_ID, "property_id": to_uuid("prop_scottsdale"), "building_id": to_uuid("bld_sv_main"), "label": "Unit 214", "floor": 2, "bedrooms": 3, "bathrooms": 2, "square_feet": 1420, "occupancy_status": "occupied", "created_at": now, "updated_at": now},
]
post_table("unit", units)

print("Base schema seed completed successfully!")
