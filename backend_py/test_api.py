import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup test DB
TEST_DB_URL = "sqlite:///./test_nameplate.db"
os.environ["DATABASE_URL"] = TEST_DB_URL

from backend_py.database import Base, get_db
from backend_py.main import app
from backend_py.seed_data import seed_database

test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_nameplate.db"):
        try:
            os.remove("./test_nameplate.db")
        except Exception:
            pass


@pytest.fixture
def client():
    return TestClient(app)


# 1. Health & Root tests
def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Nameplate REST API"
    assert data["status"] == "online"


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


# 2. Properties & Units
def test_list_properties(client):
    response = client.get("/api/properties")
    assert response.status_code == 200
    props = response.json()
    assert len(props) >= 6
    assert any(p["id"] == "prop_sonoran_ridge" for p in props)


def test_get_property(client):
    response = client.get("/api/properties/prop_sonoran_ridge")
    assert response.status_code == 200
    prop = response.json()
    assert prop["name"] == "Sonoran Ridge Residences"
    assert prop["code"] == "SRR"


def test_get_property_units(client):
    response = client.get("/api/properties/prop_sonoran_ridge/units")
    assert response.status_code == 200
    units = response.json()
    assert len(units) >= 4
    assert any(u["label"] == "402" for u in units)


def test_create_property_and_unit(client):
    # Create Property
    prop_payload = {
        "name": "Highland Park Lofts",
        "code": "HPL",
        "city": "Scottsdale",
        "state": "AZ",
        "postalCode": "85250",
        "unitCountDeclared": 50,
    }
    create_prop_res = client.post("/api/properties", json=prop_payload)
    assert create_prop_res.status_code == 201
    prop = create_prop_res.json()
    prop_id = prop["id"]
    assert prop["name"] == "Highland Park Lofts"

    # Create Unit in Property
    unit_payload = {
        "label": "PH-1",
        "floor": 5,
        "bedrooms": 3,
        "bathrooms": 2.5,
        "squareFeet": 1850,
        "occupancyStatus": "vacant",
    }
    create_unit_res = client.post(f"/api/properties/{prop_id}/units", json=unit_payload)
    assert create_unit_res.status_code == 201
    unit = create_unit_res.json()
    assert unit["label"] == "PH-1"
    assert unit["propertyId"] == prop_id


# 3. Categories & Assets
def test_list_categories(client):
    response = client.get("/api/categories")
    assert response.status_code == 200
    cats = response.json()
    assert len(cats) >= 7
    assert any(c["key"] == "hvac" for c in cats)


def test_list_assets(client):
    response = client.get("/api/assets")
    assert response.status_code == 200
    assets = response.json()
    assert len(assets) >= 10

    # Filter by property
    filtered_res = client.get("/api/assets?propertyId=prop_sonoran_ridge")
    assert filtered_res.status_code == 200
    assert all(a["currentPropertyId"] == "prop_sonoran_ridge" for a in filtered_res.json())

    # Search
    search_res = client.get("/api/assets?search=Carrier")
    assert search_res.status_code == 200
    assert len(search_res.json()) >= 1


def test_get_and_lookup_asset(client):
    # Get by ID
    res = client.get("/api/assets/asset_hvac_402")
    assert res.status_code == 200
    asset = res.json()
    assert asset["npid"] == "NP-1M4K9X23"
    assert asset["manufacturerRaw"] == "Carrier"
    assert asset["currentProperty"]["name"] == "Sonoran Ridge Residences"

    # Lookup by NPID
    lookup_res = client.get("/api/assets/lookup/NP-1M4K9X23")
    assert lookup_res.status_code == 200
    assert lookup_res.json()["id"] == "asset_hvac_402"

    # Lookup with lowercase / unformatted code
    lookup_norm = client.get("/api/assets/lookup/1m4k9x23")
    assert lookup_norm.status_code == 200
    assert lookup_norm.json()["id"] == "asset_hvac_402"


def test_create_and_update_asset(client):
    asset_payload = {
        "categoryId": "cat_dishwasher",
        "manufacturerRaw": "Bosch",
        "modelRaw": "SHPM65Z55N",
        "serialNumber": "BS9920141",
        "status": "active",
        "condition": "new",
        "currentPropertyId": "prop_sonoran_ridge",
        "currentUnitId": "unit_403",
        "purchaseCost": 949.0,
        "notes": "Installed brand new Bosch dishwasher.",
    }
    create_res = client.post("/api/assets", json=asset_payload)
    assert create_res.status_code == 201
    new_asset = create_res.json()
    assert new_asset["npid"].startswith("NP-")
    assert new_asset["manufacturerRaw"] == "Bosch"

    asset_id = new_asset["id"]

    # Update asset
    update_payload = {
        "status": "needs_repair",
        "condition": "fair",
        "notes": "Drain pump reported slow.",
    }
    put_res = client.put(f"/api/assets/{asset_id}", json=update_payload)
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["status"] == "needs_repair"
    assert updated["condition"] == "fair"

    # Delete asset
    del_res = client.delete(f"/api/assets/{asset_id}")
    assert del_res.status_code == 200


# 4. Work Orders
def test_list_work_orders(client):
    res = client.get("/api/work-orders")
    assert res.status_code == 200
    wos = res.json()
    assert len(wos) >= 5
    assert any(w["number"] == 1048 for w in wos)


def test_get_work_order(client):
    # Get by number
    res = client.get("/api/work-orders/1048")
    assert res.status_code == 200
    wo = res.json()
    assert wo["id"] == "wo_1048"
    assert wo["priority"] == "urgent"
    assert len(wo["notesList"]) >= 2

    # Get by string id
    res_id = client.get("/api/work-orders/wo_1048")
    assert res_id.status_code == 200


def test_create_work_order_and_notes(client):
    payload = {
        "title": "Water Leak Inspection under Sink",
        "description": "Tenant noticed water pooling near P-trap.",
        "status": "open",
        "priority": "high",
        "category": "Plumbing",
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "assignee": "J. Morales",
    }
    create_res = client.post("/api/work-orders", json=payload)
    assert create_res.status_code == 201
    wo = create_res.json()
    wo_id = wo["id"]
    assert wo["title"] == payload["title"]

    # Add note
    note_payload = {
        "author": "J. Morales",
        "text": "Tightened slip joint washer on P-trap. Leak resolved.",
    }
    note_res = client.post(f"/api/work-orders/{wo_id}/notes", json=note_payload)
    assert note_res.status_code == 200
    updated_wo = note_res.json()
    assert any("Tightened slip joint" in n["text"] for n in updated_wo["notesList"])

    # Update status
    status_payload = {
        "status": "completed",
        "resolution": "P-trap re-seated and tested under load.",
        "actualCost": 0.0,
    }
    status_res = client.post(f"/api/work-orders/{wo_id}/status", json=status_payload)
    assert status_res.status_code == 200
    completed_wo = status_res.json()
    assert completed_wo["status"] == "completed"
    assert completed_wo["resolution"] == "P-trap re-seated and tested under load."


# 5. Service Events
def test_list_and_create_service_events(client):
    list_res = client.get("/api/service-events")
    assert list_res.status_code == 200
    events = list_res.json()
    assert len(events) >= 2

    # Create service event
    payload = {
        "assetId": "asset_hvac_402",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Replaced run capacitor and lubricated blower bearings.",
        "symptomCodes": ["NOISY_BEARINGS", "LOW_AMPERAGE"],
        "resolutionCode": "fixed",
        "laborMinutes": 45,
        "laborRate": 68.0,
        "partsCost": 32.0,
        "costBorneBy": "owner",
    }
    post_res = client.post("/api/service-events", json=payload)
    assert post_res.status_code == 201
    ev = post_res.json()
    assert ev["laborCost"] == 51.0
    assert ev["totalCost"] == 83.0

    # Verify event retrieval
    get_res = client.get(f"/api/service-events/{ev['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == ev["id"]


# 6. Users & Memberships
def test_list_and_invite_user(client):
    users_res = client.get("/api/users")
    assert users_res.status_code == 200
    users = users_res.json()
    assert len(users) >= 5
    assert any(u["email"] == "j.morales@sonoran.example" for u in users)

    # Invite user
    invite_payload = {
        "email": "c.reyes@sonoran.example",
        "fullName": "Carlos Reyes",
        "phone": "(602) 555-0999",
        "role": "technician",
        "employmentType": "employee",
        "hourlyLaborRate": 60.0,
        "propertyIds": ["prop_sonoran_ridge", "prop_desert_palm"],
    }
    inv_res = client.post("/api/users/invite", json=invite_payload)
    assert inv_res.status_code == 201
    new_user = inv_res.json()
    assert new_user["email"] == "c.reyes@sonoran.example"
    assert len(new_user["properties"]) == 2

    # Reject duplicate email
    dup_res = client.post("/api/users/invite", json=invite_payload)
    assert dup_res.status_code == 400

    # Toggle status
    toggle_res = client.post(f"/api/users/{new_user['id']}/toggle-status")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["status"] in ("active", "revoked")


# 7. Offline Sync
def test_sync_push_and_status(client):
    status_res = client.get("/api/sync/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["status"] == "healthy"

    sync_payload = {
        "batchId": "BATCH-TEST-01",
        "deviceId": "dev_iphone16_01",
        "userId": "user_morales",
        "operations": [
            {
                "opId": "op_test_asset_01",
                "entityType": "asset",
                "entityId": "asset_sync_test_01",
                "opType": "create",
                "payload": {
                    "npid": "NP-99SYNC01",
                    "manufacturerRaw": "Carrier",
                    "modelRaw": "SYNC-TEST-01",
                    "status": "active",
                },
            }
        ],
    }

    push_res = client.post("/api/sync/push", json=sync_payload)
    assert push_res.status_code == 200
    resp_data = push_res.json()
    assert resp_data["appliedCount"] == 1

    # Push duplicate operation
    dup_push = client.post("/api/sync/push", json=sync_payload)
    assert dup_push.status_code == 200
    dup_data = dup_push.json()
    assert dup_data["duplicateCount"] == 1


# 8. QR Tag generation
def test_qr_tag_generation(client):
    res = client.get("/api/qr/tag/NP-1M4K9X23")
    assert res.status_code == 200
    tag = res.json()
    assert tag["npid"] == "NP-1M4K9X23"
    assert "https://np.app/a/1M4K9X23" in tag["url"]
    assert tag["signature"] != ""
    assert tag["svg"].startswith("<svg") or "svg" in tag["svg"]
    assert tag["dataUrl"].startswith("data:image/png;base64,")

    # SVG format output
    svg_res = client.get("/api/qr/tag/NP-1M4K9X23?format=svg")
    assert svg_res.status_code == 200
    assert svg_res.headers["content-type"].startswith("image/svg+xml")

    # PNG format output
    png_res = client.get("/api/qr/tag/NP-1M4K9X23?format=png")
    assert png_res.status_code == 200
    assert png_res.headers["content-type"].startswith("image/png")
