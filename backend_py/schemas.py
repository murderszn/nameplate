from __future__ import annotations
import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


# ================= Organization =================
class Organization(CamelModel):
    id: str
    name: str
    slug: str
    plan: str = "Enterprise Portfolio Tier"
    timezone: Optional[str] = "America/Phoenix"
    currency: Optional[str] = "USD"
    settings: Optional[Dict[str, Any]] = None


# ================= Property & Building =================
class Building(CamelModel):
    id: str
    property_id: str
    name: str
    code: Optional[str] = None
    floors: Optional[int] = None


class BuildingCreate(CamelModel):
    name: str
    code: Optional[str] = None
    floors: Optional[int] = None
    property_id: Optional[str] = None


class Property(CamelModel):
    id: str
    name: str
    code: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    status: str = "active"
    unit_count_declared: Optional[int] = None
    latitude: Optional[Union[float, str]] = None
    longitude: Optional[Union[float, str]] = None
    year_built: Optional[int] = None
    timezone: Optional[str] = "America/Phoenix"


class PropertyCreate(CamelModel):
    name: str
    code: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    status: str = "active"
    unit_count_declared: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    year_built: Optional[int] = None
    timezone: Optional[str] = "America/Phoenix"
    org_id: Optional[str] = None


# ================= Unit =================
class Unit(CamelModel):
    id: str
    property_id: str
    building_id: Optional[str] = None
    label: str
    floor: Optional[int] = None
    bedrooms: Optional[float] = None
    bathrooms: Optional[float] = None
    square_feet: Optional[int] = None
    occupancy_status: Optional[str] = "occupied"
    building: Optional[Building] = None


class UnitCreate(CamelModel):
    label: str
    building_id: Optional[str] = None
    property_id: Optional[str] = None
    floor: Optional[int] = None
    bedrooms: Optional[float] = None
    bathrooms: Optional[float] = None
    square_feet: Optional[int] = None
    occupancy_status: Optional[str] = "occupied"
    notes: Optional[str] = None
    org_id: Optional[str] = None


# ================= Asset Categories & Models =================
class AssetCategory(CamelModel):
    id: str
    key: str
    display_name: str
    default_useful_life_months: Optional[int] = 120
    default_replacement_cost: Optional[Union[float, str]] = None
    is_serialized: Optional[bool] = True
    icon_key: Optional[str] = None


class AssetModel(CamelModel):
    id: str
    manufacturer: str
    model_number: str
    display_name: Optional[str] = None
    typical_replacement_cost: Optional[Union[float, str]] = None
    expected_life_months: Optional[int] = None
    spec: Optional[Dict[str, Any]] = None
    verification_status: Optional[str] = "verified"


class CriticalPart(CamelModel):
    type: str = "red"  # 'red' | 'white'
    title: str
    text: str


class AssetCustomFields(CamelModel):
    schematic_key: Optional[str] = None
    spec_tag: Optional[str] = None
    room: Optional[str] = None
    gps: Optional[str] = None
    owner: Optional[str] = None
    warranty_sub: Optional[str] = None
    warranty_extra: Optional[str] = None
    compressor_warranty: Optional[str] = None
    description: Optional[str] = None
    serial_label: Optional[str] = None
    critical_parts: Optional[List[CriticalPart]] = None

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="allow",
    )


# ================= Part Record =================
class PartRecord(CamelModel):
    id: str
    label: Optional[str] = None
    component_type: Optional[str] = None
    origin: Optional[str] = None
    status: str = "in_stock"
    imputed_value: Optional[Union[float, str]] = None
    acquisition_cost: Optional[Union[float, str]] = 0.0
    installed_in_asset_id: Optional[str] = None
    source_asset_id: Optional[str] = None
    serial_number: Optional[str] = None


# ================= Service Event =================
class ServiceEventTechnician(CamelModel):
    id: str
    user: Optional[Dict[str, Any]] = None


class ServiceEventWorkOrderSummary(CamelModel):
    id: str
    number: Optional[int] = None
    title: Optional[str] = None


class ServiceEvent(CamelModel):
    id: str
    asset_id: str
    work_order_id: Optional[str] = None
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    technician_id: str
    event_type: str
    findings: Optional[str] = None
    symptom_codes: List[str] = Field(default_factory=list)
    resolution_code: Optional[str] = None
    labor_minutes: Optional[int] = None
    labor_rate: Optional[Union[float, str]] = None
    labor_cost: Optional[Union[float, str]] = None
    parts_cost: Optional[Union[float, str]] = None
    other_cost: Optional[Union[float, str]] = None
    total_cost: Optional[Union[float, str]] = None
    cost_borne_by: Optional[str] = None
    is_warranty_claim: bool = False
    occurred_at: Optional[Union[str, datetime.datetime]] = None
    technician: Optional[Union[ServiceEventTechnician, Dict[str, Any], str]] = None
    work_order: Optional[Union[ServiceEventWorkOrderSummary, Dict[str, Any]]] = None
    part_usages: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class ServiceEventCreate(CamelModel):
    asset_id: str
    work_order_id: Optional[str] = None
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    technician_id: str = "tech_morales"
    event_type: str = "maintenance"
    findings: Optional[str] = None
    symptom_codes: List[str] = Field(default_factory=list)
    resolution_code: Optional[str] = None
    labor_minutes: Optional[int] = 30
    labor_rate: Optional[float] = 65.0
    parts_cost: Optional[float] = 0.0
    other_cost: Optional[float] = 0.0
    cost_borne_by: Optional[str] = "owner"
    is_warranty_claim: bool = False
    occurred_at: Optional[str] = None
    part_usages: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    org_id: Optional[str] = None


# ================= Asset =================
class Asset(CamelModel):
    id: str
    npid: str
    category_id: str
    asset_model_id: Optional[str] = None
    manufacturer_raw: Optional[str] = None
    model_raw: Optional[str] = None
    serial_number: Optional[str] = None
    serial_confidence: Optional[str] = "verified"
    status: str = "active"
    condition: Optional[str] = "good"
    current_property_id: Optional[str] = None
    current_unit_id: Optional[str] = None
    current_location_confirmed_at: Optional[Union[str, datetime.datetime]] = None
    install_date: Optional[Union[str, datetime.date, datetime.datetime]] = None
    manufacture_date: Optional[Union[str, datetime.date, datetime.datetime]] = None
    warranty_expires_on: Optional[Union[str, datetime.date, datetime.datetime]] = None
    purchase_cost: Optional[Union[float, str]] = None
    expected_life_months: Optional[int] = None
    lifetime_service_cost: Optional[Union[float, str]] = 0
    service_event_count: Optional[int] = 0
    last_service_at: Optional[Union[str, datetime.datetime]] = None
    notes: Optional[str] = None
    custom_fields: Optional[Union[Dict[str, Any], AssetCustomFields]] = None
    category: Optional[AssetCategory] = None
    asset_model: Optional[AssetModel] = None
    current_property: Optional[Property] = None
    current_unit: Optional[Unit] = None
    service_events: Optional[List[ServiceEvent]] = None
    parts_installed: Optional[List[PartRecord]] = None
    parts_sourced: Optional[List[PartRecord]] = None


class AssetCreate(CamelModel):
    npid: Optional[str] = None
    category_id: str
    asset_model_id: Optional[str] = None
    manufacturer_raw: Optional[str] = None
    model_raw: Optional[str] = None
    serial_number: Optional[str] = None
    serial_confidence: Optional[str] = "verified"
    status: str = "active"
    condition: Optional[str] = "good"
    current_property_id: Optional[str] = None
    current_unit_id: Optional[str] = None
    install_date: Optional[str] = None
    manufacture_date: Optional[str] = None
    warranty_expires_on: Optional[str] = None
    purchase_cost: Optional[float] = None
    expected_life_months: Optional[int] = 120
    notes: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    org_id: Optional[str] = None


class AssetUpdate(CamelModel):
    npid: Optional[str] = None
    category_id: Optional[str] = None
    asset_model_id: Optional[str] = None
    manufacturer_raw: Optional[str] = None
    model_raw: Optional[str] = None
    serial_number: Optional[str] = None
    serial_confidence: Optional[str] = None
    status: Optional[str] = None
    condition: Optional[str] = None
    current_property_id: Optional[str] = None
    current_unit_id: Optional[str] = None
    current_location_confirmed_at: Optional[str] = None
    install_date: Optional[str] = None
    manufacture_date: Optional[str] = None
    warranty_expires_on: Optional[str] = None
    purchase_cost: Optional[float] = None
    expected_life_months: Optional[int] = None
    notes: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None


# ================= Work Orders =================
class WorkOrderNote(CamelModel):
    id: str
    author: str
    avatar: Optional[str] = None
    created_at: Union[str, datetime.datetime]
    text: str
    type: Optional[str] = "note"  # 'note' | 'status_change' | 'part_ordered'


class WorkOrderNoteCreate(CamelModel):
    text: str
    author: Optional[str] = "Tech Morales"
    type: Optional[str] = "note"
    avatar: Optional[str] = None


class WorkOrderStatusUpdate(CamelModel):
    status: str
    resolution: Optional[str] = None
    actual_cost: Optional[float] = None
    note: Optional[str] = None
    author: Optional[str] = "HQ Dispatch"


class WorkOrder(CamelModel):
    id: str
    number: int
    title: str
    description: Optional[str] = None
    status: str = "open"
    priority: str = "normal"
    category: Optional[str] = None
    property_id: str
    property_name: Optional[str] = None
    unit_id: Optional[str] = None
    unit_label: Optional[str] = None
    asset_id: Optional[str] = None
    asset_npid: Optional[str] = None
    asset_name: Optional[str] = None
    assignee: Optional[str] = None
    sla_due_at: Optional[Union[str, datetime.datetime]] = None
    completed_at: Optional[Union[str, datetime.datetime]] = None
    resolution: Optional[str] = None
    actual_cost: Optional[Union[float, str]] = 0.0
    parts_required: Optional[List[str]] = Field(default_factory=list)
    notes_list: Optional[List[WorkOrderNote]] = Field(default_factory=list)


class WorkOrderCreate(CamelModel):
    title: str
    description: Optional[str] = None
    status: str = "open"
    priority: str = "normal"
    category: Optional[str] = None
    property_id: str
    unit_id: Optional[str] = None
    asset_id: Optional[str] = None
    assignee: Optional[str] = None
    sla_due_at: Optional[str] = None
    actual_cost: Optional[float] = 0.0
    parts_required: Optional[List[str]] = Field(default_factory=list)
    notes_list: Optional[List[WorkOrderNote]] = Field(default_factory=list)
    org_id: Optional[str] = None


class WorkOrderUpdate(CamelModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    asset_id: Optional[str] = None
    assignee: Optional[str] = None
    sla_due_at: Optional[str] = None
    completed_at: Optional[str] = None
    resolution: Optional[str] = None
    actual_cost: Optional[float] = None
    parts_required: Optional[List[str]] = None
    notes_list: Optional[List[WorkOrderNote]] = None


# ================= Users & Memberships =================
class MaintenanceUserProperty(CamelModel):
    id: str
    name: str
    code: Optional[str] = None


class MaintenanceUser(CamelModel):
    id: str
    user_id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    user_status: str = "active"
    role: str = "technician"
    employment_type: Optional[str] = None
    hourly_labor_rate: Optional[Union[float, str]] = None
    status: str = "active"  # 'invited' | 'active' | 'revoked'
    last_seen_at: Optional[Union[str, datetime.datetime]] = None
    invited_at: Union[str, datetime.datetime]
    properties: List[MaintenanceUserProperty] = Field(default_factory=list)


class InviteMaintenanceUserInput(CamelModel):
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str = "technician"
    employment_type: Optional[str] = "employee"
    hourly_labor_rate: Optional[float] = None
    property_ids: List[str] = Field(default_factory=list)
    org_id: Optional[str] = None


class UpdateMaintenanceUserInput(CamelModel):
    role: Optional[str] = None
    employment_type: Optional[str] = None
    hourly_labor_rate: Optional[float] = None
    status: Optional[str] = None
    property_ids: Optional[List[str]] = None


# ================= Offline Sync Batch =================
class SyncOpItem(CamelModel):
    op_id: str
    entity_type: str
    entity_id: Optional[str] = None
    op_type: str  # create, update, delete, service_event, note_add
    payload: Dict[str, Any] = Field(default_factory=dict)
    occurred_at: Optional[Union[str, int, datetime.datetime]] = None
    client_signature: Optional[str] = None


class SyncPushRequest(CamelModel):
    batch_id: Optional[str] = None
    device_id: str
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    operations: List[SyncOpItem] = Field(default_factory=list)
    events: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class SyncOpResult(CamelModel):
    op_id: str
    status: str  # applied, duplicate, rejected
    entity_type: str
    entity_id: Optional[str] = None
    error: Optional[str] = None


class SyncPushResponse(CamelModel):
    batch_id: str
    processed_count: int
    applied_count: int
    duplicate_count: int
    rejected_count: int
    results: List[SyncOpResult] = Field(default_factory=list)


class SyncStatusResponse(CamelModel):
    status: str = "healthy"
    server_time: str
    last_sync_cursor: Optional[int] = 0
    pending_reconciliations: int = 0
    active_devices: int = 0
    synced_ops_count: int = 0


# ================= QR Tag =================
class QRTagResponse(CamelModel):
    npid: str
    clean_npid: str
    url: str
    compact_uri: str
    signature: str
    timestamp: str
    batch_id: str
    org_id: str
    crypto_enabled: str = "true"
    svg: Optional[str] = None
    data_url: Optional[str] = None
    ansi: Optional[str] = None
