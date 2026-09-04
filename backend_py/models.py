import os
import sys
import json
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

if __package__ is None or __package__ == "":
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from backend_py.db import Base
else:
    from .db import Base

builtins_property = property


def now_utc():
    return datetime.now(timezone.utc)


def parse_dt(val):
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    plan = Column(String, default="Enterprise Portfolio Tier")
    created_at = Column(DateTime, default=now_utc)

    properties = relationship("Property", back_populates="organization")


class Property(Base):
    __tablename__ = "properties"

    id = Column(String, primary_key=True, default=lambda: f"prop_{uuid.uuid4().hex[:12]}")
    organization_id = Column(String, ForeignKey("organizations.id"), default="org_sonoran", nullable=True)
    name = Column(String, nullable=False)
    code = Column(String, nullable=True)
    address_line1 = Column(String, nullable=True)
    address_line2 = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    status = Column(String, default="active")
    unit_count_declared = Column(Integer, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    year_built = Column(Integer, nullable=True)
    timezone = Column(String, default="America/Phoenix")
    created_at = Column(DateTime, default=now_utc)

    organization = relationship("Organization", back_populates="properties")
    buildings = relationship("Building", back_populates="property", cascade="all, delete-orphan")
    units = relationship("Unit", back_populates="property", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="current_property")
    work_orders = relationship("WorkOrder", back_populates="property")


class Building(Base):
    __tablename__ = "buildings"

    id = Column(String, primary_key=True, default=lambda: f"bld_{uuid.uuid4().hex[:12]}")
    property_id = Column(String, ForeignKey("properties.id"), nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=True)
    floors = Column(Integer, default=3)

    property = relationship("Property", back_populates="buildings")
    units = relationship("Unit", back_populates="building")


class Unit(Base):
    __tablename__ = "units"

    id = Column(String, primary_key=True, default=lambda: f"unit_{uuid.uuid4().hex[:12]}")
    property_id = Column(String, ForeignKey("properties.id"), nullable=False)
    building_id = Column(String, ForeignKey("buildings.id"), nullable=True)
    label = Column(String, nullable=False)
    floor = Column(Integer, nullable=True)
    bedrooms = Column(Integer, nullable=True)
    bathrooms = Column(Float, nullable=True)
    square_feet = Column(Integer, nullable=True)
    occupancy_status = Column(String, default="occupied")
    notes = Column(Text, nullable=True)

    property = relationship("Property", back_populates="units")
    building = relationship("Building", back_populates="units")
    assets = relationship("Asset", back_populates="unit")
    work_orders = relationship("WorkOrder", back_populates="unit")


class AssetCategory(Base):
    __tablename__ = "asset_categories"

    id = Column(String, primary_key=True)
    key = Column(String, unique=True, nullable=False)
    display_name = Column(String, nullable=False)
    default_useful_life_months = Column(Integer, default=120)
    default_replacement_cost = Column(Float, default=950.0)

    assets = relationship("Asset", back_populates="category")


class AssetModel(Base):
    __tablename__ = "asset_models"

    id = Column(String, primary_key=True)
    manufacturer = Column(String, nullable=False)
    model_number = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    typical_replacement_cost = Column(Float, nullable=True)
    expected_life_months = Column(Integer, default=120)

    assets = relationship("Asset", back_populates="asset_model")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True, default=lambda: f"asset_{uuid.uuid4().hex[:12]}")
    npid = Column(String, unique=True, index=True, nullable=False)
    category_id = Column(String, ForeignKey("asset_categories.id"), nullable=False)
    asset_model_id = Column(String, ForeignKey("asset_models.id"), nullable=True)
    manufacturer_raw = Column(String, nullable=True)
    model_raw = Column(String, nullable=True)
    serial_number = Column(String, nullable=True)
    serial_confidence = Column(String, default="verified")
    status = Column(String, default="active")
    condition = Column(String, default="good")
    current_property_id = Column(String, ForeignKey("properties.id"), nullable=True)
    current_unit_id = Column(String, ForeignKey("units.id"), nullable=True)
    current_location_confirmed_at = Column(DateTime, nullable=True)
    install_date = Column(DateTime, nullable=True)
    manufacture_date = Column(DateTime, nullable=True)
    warranty_expires_on = Column(DateTime, nullable=True)
    purchase_cost = Column(Float, default=0.0)
    expected_life_months = Column(Integer, default=120)
    lifetime_service_cost = Column(Float, default=0.0)
    service_event_count = Column(Integer, default=0)
    last_service_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    custom_fields_json = Column(Text, default="{}")
    deleted_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    category = relationship("AssetCategory", back_populates="assets")
    asset_model = relationship("AssetModel", back_populates="assets")
    current_property = relationship("Property", back_populates="assets")
    unit = relationship("Unit", back_populates="assets")
    work_orders = relationship("WorkOrder", back_populates="asset")
    service_events = relationship("ServiceEvent", back_populates="asset")
    parts_installed = relationship("PartRecord", foreign_keys="PartRecord.installed_in_asset_id", back_populates="installed_in_asset")
    parts_sourced = relationship("PartRecord", foreign_keys="PartRecord.source_asset_id", back_populates="source_asset")

    @builtins_property
    def current_unit(self):
        return self.unit

    @builtins_property
    def custom_fields(self):
        try:
            return json.loads(self.custom_fields_json or "{}")
        except Exception:
            return {}

    @custom_fields.setter
    def custom_fields(self, val):
        self.custom_fields_json = json.dumps(val or {})


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(String, primary_key=True, default=lambda: f"wo_{uuid.uuid4().hex[:12]}")
    number = Column(Integer, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="open")  # open, assigned, in_progress, awaiting_parts, completed
    priority = Column(String, default="normal")  # emergency, urgent, high, normal, low
    category = Column(String, default="HVAC")
    property_id = Column(String, ForeignKey("properties.id"), nullable=False)
    unit_id = Column(String, ForeignKey("units.id"), nullable=True)
    asset_id = Column(String, ForeignKey("assets.id"), nullable=True)
    assignee = Column(String, nullable=True)
    sla_due_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    resolution = Column(Text, nullable=True)
    actual_cost = Column(Float, default=0.0)
    parts_required_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    property = relationship("Property", back_populates="work_orders")
    unit = relationship("Unit", back_populates="work_orders")
    asset = relationship("Asset", back_populates="work_orders")
    notes = relationship("WorkOrderNote", back_populates="work_order", cascade="all, delete-orphan")

    @builtins_property
    def parts_required(self):
        try:
            return json.loads(self.parts_required_json or "[]")
        except Exception:
            return []

    @parts_required.setter
    def parts_required(self, val):
        self.parts_required_json = json.dumps(val or [])

    @builtins_property
    def notes_list(self):
        return self.notes


class WorkOrderNote(Base):
    __tablename__ = "work_order_notes"

    id = Column(String, primary_key=True, default=lambda: f"wonote_{uuid.uuid4().hex[:12]}")
    work_order_id = Column(String, ForeignKey("work_orders.id"), nullable=False)
    author = Column(String, nullable=False)
    avatar = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    type = Column("type", String, default="note")
    created_at = Column(DateTime, default=now_utc)

    work_order = relationship("WorkOrder", back_populates="notes")

    @builtins_property
    def note_type(self):
        return self.type

    @note_type.setter
    def note_type(self, val):
        self.type = val


class ServiceEvent(Base):
    __tablename__ = "service_events"

    id = Column(String, primary_key=True, default=lambda: f"se_{uuid.uuid4().hex[:12]}")
    asset_id = Column(String, ForeignKey("assets.id"), nullable=False)
    work_order_id = Column(String, ForeignKey("work_orders.id"), nullable=True)
    property_id = Column(String, ForeignKey("properties.id"), nullable=True)
    unit_id = Column(String, ForeignKey("units.id"), nullable=True)
    technician_id = Column(String, nullable=False)
    event_type = Column(String, default="repair")
    findings = Column(Text, nullable=True)
    symptom_codes_json = Column(Text, default="[]")
    resolution_code = Column(String, nullable=True)
    labor_minutes = Column(Integer, default=45)
    labor_rate = Column(Float, default=85.0)
    labor_cost = Column(Float, default=63.75)
    parts_cost = Column(Float, default=0.0)
    other_cost = Column(Float, default=0.0)
    total_cost = Column(Float, default=63.75)
    cost_borne_by = Column(String, default="property")
    is_warranty_claim = Column(Boolean, default=False)
    occurred_at = Column(DateTime, default=now_utc)
    deleted_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    asset = relationship("Asset", back_populates="service_events")
    work_order = relationship("WorkOrder", foreign_keys=[work_order_id])
    property = relationship("Property", foreign_keys=[property_id])
    unit = relationship("Unit", foreign_keys=[unit_id])

    @builtins_property
    def symptom_codes(self):
        try:
            return json.loads(self.symptom_codes_json or "[]")
        except Exception:
            return []

    @symptom_codes.setter
    def symptom_codes(self, val):
        self.symptom_codes_json = json.dumps(val or [])

    @builtins_property
    def technician_info(self):
        return getattr(self, "_technician_info", None)

    @technician_info.setter
    def technician_info(self, val):
        self._technician_info = val

    @builtins_property
    def work_order_info(self):
        return getattr(self, "_work_order_info", None)

    @work_order_info.setter
    def work_order_info(self, val):
        self._work_order_info = val

    @builtins_property
    def part_usages(self):
        return getattr(self, "_part_usages", [])

    @part_usages.setter
    def part_usages(self, val):
        self._part_usages = val or []


class PartRecord(Base):
    __tablename__ = "part_records"

    id = Column(String, primary_key=True, default=lambda: f"part_{uuid.uuid4().hex[:12]}")
    label = Column(String, nullable=False)
    component_type = Column(String, nullable=True)
    origin = Column(String, default="new_purchase")  # new_purchase, salvaged, donor
    status = Column(String, default="installed")
    imputed_value = Column(Float, default=0.0)
    installed_in_asset_id = Column(String, ForeignKey("assets.id"), nullable=True)
    source_asset_id = Column(String, ForeignKey("assets.id"), nullable=True)
    created_at = Column(DateTime, default=now_utc)

    installed_in_asset = relationship("Asset", foreign_keys=[installed_in_asset_id], back_populates="parts_installed")
    source_asset = relationship("Asset", foreign_keys=[source_asset_id], back_populates="parts_sourced")


class MaintenanceUser(Base):
    __tablename__ = "maintenance_users"

    id = Column(String, primary_key=True, default=lambda: f"mem_{uuid.uuid4().hex[:12]}")
    user_id = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    user_status = Column(String, default="active")
    role = Column(String, default="technician")  # lead_tech, technician, property_manager, viewer
    employment_type = Column(String, default="employee")
    hourly_labor_rate = Column(Float, nullable=True, default=58.0)
    status = Column(String, default="active")  # invited, active, revoked
    last_seen_at = Column(DateTime, nullable=True)
    invited_at = Column(DateTime, default=now_utc)
    property_ids_json = Column(Text, default="[]")

    @builtins_property
    def property_ids(self):
        try:
            return json.loads(self.property_ids_json or "[]")
        except Exception:
            return []

    @property_ids.setter
    def property_ids(self, val):
        self.property_ids_json = json.dumps(val or [])


class SyncBatch(Base):
    __tablename__ = "sync_batches"

    id = Column(String, primary_key=True, default=lambda: f"batch_{uuid.uuid4().hex[:12]}")
    device_id = Column(String, nullable=False)
    client_timestamp = Column(DateTime, nullable=False)
    server_timestamp = Column(DateTime, default=now_utc)
    payload_hash = Column(String, nullable=False)
    record_count = Column(Integer, default=0)
    status = Column(String, default="committed")


class SyncOp(Base):
    __tablename__ = "sync_ops"

    op_id = Column(String, primary_key=True)
    batch_id = Column(String, nullable=True)
    device_id = Column(String, nullable=True)
    user_id = Column(String, nullable=True)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    op_type = Column(String, nullable=True)
    status = Column(String, default="applied")
    payload_json = Column(Text, default="{}")
    error_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now_utc)

    @builtins_property
    def payload(self):
        try:
            return json.loads(self.payload_json or "{}")
        except Exception:
            return {}

    @payload.setter
    def payload(self, val):
        self.payload_json = json.dumps(val or {})

    @builtins_property
    def error(self):
        try:
            return json.loads(self.error_json or "{}") if self.error_json else None
        except Exception:
            return None

    @error.setter
    def error(self, val):
        self.error_json = json.dumps(val) if val else None
