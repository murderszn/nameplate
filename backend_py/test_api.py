import pytest
from fastapi.testclient import TestClient
from backend_py.main import app
from backend_py.seed import seed_database

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    seed_database()


def test_health_check():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


def test_get_organization():
    res = client.get("/api/org")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "org_sonoran"
    assert "Sonoran" in data["name"]


def test_list_properties_and_units():
    res = client.get("/api/properties")
    assert res.status_code == 200
    props = res.json()
    assert len(props) >= 2
    assert any(p["id"] == "prop_sonoran_ridge" for p in props)

    res_units = client.get("/api/properties/prop_sonoran_ridge/units")
    assert res_units.status_code == 200
    units = res_units.json()
    assert len(units) >= 4
    assert any(u["label"] == "Unit 402" for u in units)


def test_list_assets_and_lookup():
    res = client.get("/api/assets")
    assert res.status_code == 200
    assets = res.json()
    assert len(assets) >= 4

    # Lookup by NPID
    res_lookup = client.get("/api/assets/lookup/NP-1M4K9X23")
    assert res_lookup.status_code == 200
    asset = res_lookup.json()
    assert asset["npid"] == "NP-1M4K9X23"
    assert asset["manufacturerRaw"] == "Carrier"
    assert asset["category"]["displayName"] == "HVAC System"


def test_work_orders_flow():
    # 1. List work orders
    res = client.get("/api/work-orders")
    assert res.status_code == 200
    wos = res.json()
    assert len(wos) >= 3

    # 2. Create new work order
    payload = {
        "title": "Kitchen faucet leaking at base",
        "description": "Slow drip under sink in Unit 214",
        "priority": "normal",
        "category": "Plumbing",
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_214",
        "assignee": "Tech Chen",
    }
    create_res = client.post("/api/work-orders", json=payload)
    assert create_res.status_code == 200
    new_wo = create_res.json()
    assert new_wo["title"] == payload["title"]
    assert new_wo["status"] == "open"
    wo_id = new_wo["id"]

    # 3. Add note
    note_payload = {
        "author": "Tech Chen",
        "text": "Inspected cartridge valve, ordering replacement O-ring.",
    }
    note_res = client.post(f"/api/work-orders/{wo_id}/notes", json=note_payload)
    assert note_res.status_code == 200
    updated_wo = note_res.json()
    assert len(updated_wo["notesList"]) >= 1

    # 4. Advance status
    status_res = client.put(f"/api/work-orders/{wo_id}", json={"status": "in_progress"})
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "in_progress"


def test_service_event_logging():
    payload = {
        "assetId": "asset_carrier_58sb0a",
        "technicianId": "user-morales",
        "eventType": "repair",
        "findings": "Cleaned condensate drain and replaced air filter.",
        "symptomCodes": ["noisy"],
        "resolutionCode": "fixed",
        "laborMinutes": 30,
        "laborRate": 85.0,
        "partsCost": 25.0,
    }
    res = client.post("/api/service-events", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "recorded"
    assert data["totalCost"] == (30 / 60 * 85.0) + 25.0


def test_users_api():
    res = client.get("/api/users")
    assert res.status_code == 200
    users = res.json()
    assert len(users) >= 3
    assert any(u["role"] == "lead_tech" for u in users)

    # Toggle user status
    user_id = users[0]["id"]
    init_status = users[0]["status"]
    toggle_res = client.post(f"/api/users/{user_id}/toggle-status")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["status"] != init_status


def test_sync_api():
    res = client.get("/api/sync/status")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    push_payload = {
        "deviceId": "dev_ipad_mini_morales",
        "clientTimestamp": "2026-09-02T16:00:00Z",
        "payloadHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "events": [{"id": "ev_1"}],
        "assets": [],
    }
    push_res = client.post("/api/sync/push", json=push_payload)
    assert push_res.status_code == 200
    assert push_res.json()["status"] == "committed"


def test_qr_tag_generator():
    res = client.get("/api/qr/tag/NP-1M4K9X23")
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/png"
    assert len(res.content) > 100
