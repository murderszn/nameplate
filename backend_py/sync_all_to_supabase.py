import datetime
import json
import os
import sys
import urllib.error
import urllib.request
import uuid

sys.path.insert(0, os.path.abspath("."))
from backend_py.db import SessionLocal
from backend_py import models

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
    if not s:
        return None
    try:
        return str(uuid.UUID(s))
    except ValueError:
        return str(uuid.uuid5(NAMESPACE, str(s)))

def post_batch(table, items):
    if not items:
        return 0
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
            return len(data)
    except urllib.error.HTTPError as e:
        print(f"[{table}] Error {e.code}: {e.read().decode('utf-8')}")
        return 0

now = datetime.datetime.now(datetime.timezone.utc).isoformat()
db = SessionLocal()

# 1. Sync all AssetCategories from SQLite
sqlite_cats = db.query(models.AssetCategory).all()
cat_rows = []
for c in sqlite_cats:
    cat_rows.append({
        "id": to_uuid(c.id),
        "key": c.key or c.id,
        "display_name": c.display_name or c.name,
        "default_useful_life_months": getattr(c, "default_useful_life_months", 120) or 120,
        "default_replacement_cost": float(getattr(c, "default_replacement_cost", 800.0) or 800.0),
    })
post_batch("asset_category", cat_rows)

# 2. Sync all Properties from SQLite
sqlite_props = db.query(models.Property).all()
prop_rows = []
for p in sqlite_props:
    prop_rows.append({
        "id": to_uuid(p.id),
        "org_id": ORG_ID,
        "name": p.name,
        "code": p.code,
        "address_line1": p.address_line1 or f"{p.name} Main",
        "city": p.city or "Phoenix",
        "state": p.state or "AZ",
        "postal_code": p.postal_code or "85001",
        "status": "active",
        "unit_count_declared": p.unit_count_declared or 50,
        "latitude": p.latitude or 33.5,
        "longitude": p.longitude or -112.0,
        "year_built": p.year_built or 2015,
        "timezone": p.timezone or "America/Phoenix",
        "created_at": now,
        "updated_at": now,
    })
post_batch("property", prop_rows)

# 3. Ensure a default building for each property
bld_rows = []
for p in sqlite_props:
    bld_rows.append({
        "id": to_uuid(f"bld_{p.id}"),
        "org_id": ORG_ID,
        "property_id": to_uuid(p.id),
        "name": f"{p.name} Building A",
        "code": "BLD-A",
        "floors": 4,
        "created_at": now,
        "updated_at": now,
    })
post_batch("building", bld_rows)

# 4. Sync all Units from SQLite
sqlite_units = db.query(models.Unit).all()
unit_rows = []
for u in sqlite_units:
    unit_rows.append({
        "id": to_uuid(u.id),
        "org_id": ORG_ID,
        "property_id": to_uuid(u.property_id),
        "building_id": to_uuid(f"bld_{u.property_id}"),
        "label": u.label,
        "floor": u.floor or 1,
        "bedrooms": float(u.bedrooms or 2),
        "bathrooms": float(u.bathrooms or 1),
        "square_feet": u.square_feet or 900,
        "occupancy_status": u.occupancy_status or "occupied",
        "created_at": now,
        "updated_at": now,
    })
post_batch("unit", unit_rows)

# 5. Sync Assets with normalized enums
CONDITION_MAP = {
    "excellent": "good",
    "like_new": "new",
    "good": "good",
    "fair": "fair",
    "poor": "poor",
    "broken": "failed",
    "failed": "failed",
    "new": "new",
}
VALID_STATUSES = {"active", "needs_repair", "awaiting_parts", "in_repair", "in_storage", "unaccounted_for", "retired", "disposed", "salvage"}

sqlite_assets = db.query(models.Asset).all()
asset_rows = []
for a in sqlite_assets:
    cond = CONDITION_MAP.get((a.condition or "").lower(), "good")
    st = (a.status or "").lower()
    status_val = st if st in VALID_STATUSES else "active"
    asset_rows.append({
        "id": to_uuid(a.id),
        "org_id": ORG_ID,
        "npid": a.npid,
        "category_id": to_uuid(a.category_id),
        "manufacturer_raw": a.manufacturer_raw,
        "model_raw": a.model_raw,
        "serial_number": a.serial_number,
        "status": status_val,
        "condition": cond,
        "current_property_id": to_uuid(a.current_property_id),
        "current_unit_id": to_uuid(a.current_unit_id) if a.current_unit_id else None,
        "notes": a.notes,
        "created_at": now,
        "updated_at": now,
    })
post_batch("asset", asset_rows)

# 6. Sync Work Orders
VALID_WO_STATUSES = {"open", "assigned", "in_progress", "awaiting_parts", "awaiting_approval", "completed", "cancelled"}
VALID_PRIORITIES = {"emergency", "urgent", "standard", "low"}

sqlite_wos = db.query(models.WorkOrder).all()
wo_rows = []
for w in sqlite_wos:
    st = (w.status or "").lower()
    wo_status = st if st in VALID_WO_STATUSES else "open"
    pr = (w.priority or "").lower()
    priority = pr if pr in VALID_PRIORITIES else "standard"
    wo_rows.append({
        "id": to_uuid(w.id),
        "org_id": ORG_ID,
        "property_id": to_uuid(w.property_id),
        "number": int(w.number or 1001),
        "title": w.title or "Work Order",
        "description": w.description or "",
        "source": "technician",
        "priority": priority,
        "status": wo_status,
        "unit_id": to_uuid(w.unit_id) if w.unit_id else None,
        "asset_id": to_uuid(w.asset_id) if w.asset_id else None,
        "actual_cost": float(w.actual_cost or 0.0),
        "created_at": now,
        "updated_at": now,
        "occurred_at": now,
    })
post_batch("work_order", wo_rows)

print("Full SQLite -> Supabase sync complete!")
