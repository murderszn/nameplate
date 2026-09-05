import datetime
import json
import logging
import os
import urllib.error
import urllib.request
import uuid
from typing import Any, Dict, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger("supabase_sync")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://aifsfmvvcnxowmbuorbx.supabase.co").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Known seed org in Supabase
DEFAULT_ORG_ID = "01919cf6-928d-787c-8067-27b686ba9374"
NAMESPACE_UUID = uuid.NAMESPACE_DNS


def to_uuid(val: Any) -> str:
    """Convert any string identifier into a deterministic valid UUIDv5 if not already a UUID."""
    if not val:
        return str(uuid.uuid4())
    s = str(val).strip()
    try:
        return str(uuid.UUID(s))
    except ValueError:
        return str(uuid.uuid5(NAMESPACE_UUID, s))


def supabase_post(table: str, data: Any, on_conflict: Optional[str] = None) -> Any:
    """Post / upsert data into Supabase PostgREST table."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if on_conflict:
        url += f"?on_conflict={on_conflict}"

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }

    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"[Supabase Sync] Warning on table '{table}' ({e.code}): {err_msg}")
        return None
    except Exception as e:
        print(f"[Supabase Sync] Error on table '{table}': {e}")
        return None


def sync_asset_to_supabase(asset: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Upsert an asset record into Supabase asset table."""
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    row = {
        "id": to_uuid(asset.get("id") or asset.get("npid")),
        "org_id": to_uuid(asset.get("org_id") or DEFAULT_ORG_ID),
        "npid": asset.get("npid") or f"NP-{uuid.uuid4().hex[:8].upper()}",
        "category_id": to_uuid(asset.get("category_id") or asset.get("categoryId") or "cat_hvac"),
        "manufacturer_raw": asset.get("manufacturer_raw") or asset.get("manufacturer"),
        "model_raw": asset.get("model_raw") or asset.get("modelNumber") or asset.get("model_number"),
        "serial_number": asset.get("serial_number") or asset.get("serialNumber"),
        "status": (asset.get("status") or "active").lower(),
        "condition": (asset.get("condition") or "good").lower(),
        "current_property_id": to_uuid(asset.get("current_property_id") or asset.get("propertyId") or "prop_sonoran_ridge"),
        "current_unit_id": to_uuid(asset.get("current_unit_id") or asset.get("unitId")) if (asset.get("current_unit_id") or asset.get("unitId")) else None,
        "notes": asset.get("notes"),
        "updated_at": now_iso,
    }
    if "created_at" in asset and asset["created_at"]:
        row["created_at"] = str(asset["created_at"])
    else:
        row["created_at"] = now_iso

    return supabase_post("asset", row, on_conflict="id")


def sync_work_order_to_supabase(wo: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Upsert a work order into Supabase work_order table."""
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    number_val = wo.get("number")
    if number_val is None:
        raw_id = str(wo.get("id", "0"))
        digits = "".join(filter(str.isdigit, raw_id))
        number_val = int(digits) if digits else 1001

    status_raw = (wo.get("status") or "open").lower()
    valid_statuses = {"open", "assigned", "in_progress", "awaiting_parts", "awaiting_approval", "completed", "cancelled"}
    status_val = status_raw if status_raw in valid_statuses else "open"

    priority_raw = (wo.get("priority") or "standard").lower()
    valid_priorities = {"emergency", "urgent", "standard", "low"}
    priority_val = priority_raw if priority_raw in valid_priorities else "standard"

    row = {
        "id": to_uuid(wo.get("id")),
        "org_id": to_uuid(wo.get("org_id") or DEFAULT_ORG_ID),
        "property_id": to_uuid(wo.get("property_id") or wo.get("propertyId") or "prop_sonoran_ridge"),
        "number": int(number_val),
        "title": wo.get("title") or "Work Order",
        "description": wo.get("description"),
        "source": "technician",
        "priority": priority_val,
        "status": status_val,
        "unit_id": to_uuid(wo.get("unit_id") or wo.get("unitId")) if (wo.get("unit_id") or wo.get("unitId")) else None,
        "asset_id": to_uuid(wo.get("asset_id") or wo.get("assetId")) if (wo.get("asset_id") or wo.get("assetId")) else None,
        "actual_cost": float(wo.get("actual_cost") or wo.get("actualCost") or 0.0),
        "updated_at": now_iso,
        "occurred_at": now_iso,
    }
    if "created_at" in wo and wo["created_at"]:
        row["created_at"] = str(wo["created_at"])
    else:
        row["created_at"] = now_iso

    return supabase_post("work_order", row, on_conflict="id")


def sync_service_event_to_supabase(evt: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Upsert a service event into Supabase service_event table."""
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    raw_event_type = (evt.get("event_type") or evt.get("eventType") or "repair").lower()
    valid_event_types = {"inspection", "diagnostic", "repair", "part_replacement", "full_replacement", "installation", "removal", "cleaning", "preventive_maintenance", "warranty_service", "decommission"}
    event_type = raw_event_type if raw_event_type in valid_event_types else "repair"

    row = {
        "id": to_uuid(evt.get("id")),
        "org_id": to_uuid(evt.get("org_id") or DEFAULT_ORG_ID),
        "asset_id": to_uuid(evt.get("asset_id") or evt.get("assetId") or "asset_fridge"),
        "work_order_id": to_uuid(evt.get("work_order_id") or evt.get("workOrderId")) if (evt.get("work_order_id") or evt.get("workOrderId")) else None,
        "property_id": to_uuid(evt.get("property_id") or evt.get("propertyId") or "prop_sonoran_ridge"),
        "unit_id": to_uuid(evt.get("unit_id") or evt.get("unitId")) if (evt.get("unit_id") or evt.get("unitId")) else None,
        "technician_id": to_uuid(evt.get("technician_id") or evt.get("technicianId") or "user_morales"),
        "event_type": event_type,
        "findings": evt.get("findings") or evt.get("summary") or "Field service activity logged.",
        "occurred_at": str(evt.get("occurred_at") or evt.get("occurredAt") or now_iso),
        "device_id": str(evt.get("device_id") or evt.get("deviceId") or "field-device"),
    }
    return supabase_post("service_event", row, on_conflict="id")
