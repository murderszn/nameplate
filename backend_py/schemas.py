from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


# Organization
class OrganizationSchema(BaseModel):
    id: str
    name: str
    slug: str
    plan: str

    model_config = ConfigDict(from_attributes=True)


# Property & Units
class BuildingSchema(BaseModel):
    id: str
    propertyId: str
    name: str
    code: Optional[str] = None
    floors: Optional[int] = 3

    model_config = ConfigDict(from_attributes=True)


class UnitSchema(BaseModel):
    id: str
    propertyId: str
    buildingId: Optional[str] = None
    label: str
    floor: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    squareFeet: Optional[int] = None
    occupancyStatus: Optional[str] = "occupied"

    model_config = ConfigDict(from_attributes=True)


class PropertySchema(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    addressLine1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postalCode: Optional[str] = None
    status: str = "active"
    unitCountDeclared: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    yearBuilt: Optional[int] = None
    timezone: Optional[str] = "America/Phoenix"

    model_config = ConfigDict(from_attributes=True)


class PropertyCreate(BaseModel):
    id: Optional[str] = None
    name: str
    code: Optional[str] = None
    addressLine1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postalCode: Optional[str] = None
    unitCountDeclared: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    yearBuilt: Optional[int] = None


class UnitCreate(BaseModel):
    id: Optional[str] = None
    label: str
    floor: Optional[int] = 1
    bedrooms: Optional[int] = 1
    bathrooms: Optional[float] = 1.0
    squareFeet: Optional[int] = 750
    occupancyStatus: Optional[str] = "occupied"


# Asset Categories & Models
class AssetCategorySchema(BaseModel):
    id: str
    key: str
    displayName: str
    defaultUsefulLifeMonths: Optional[int] = 120
    defaultReplacementCost: Optional[float] = 950.0

    model_config = ConfigDict(from_attributes=True)


class AssetModelSchema(BaseModel):
    id: str
    manufacturer: str
    modelNumber: str
    displayName: Optional[str] = None
    typicalReplacementCost: Optional[float] = None
    expectedLifeMonths: Optional[int] = 120

    model_config = ConfigDict(from_attributes=True)


# Service Events & Parts
class PartRecordSchema(BaseModel):
    id: str
    label: str
    componentType: Optional[str] = None
    origin: Optional[str] = "new_purchase"
    status: str = "installed"
    imputedValue: Optional[float] = 0.0
    installedInAssetId: Optional[str] = None
    sourceAssetId: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ServiceEventCreate(BaseModel):
    assetId: str
    workOrderId: Optional[str] = None
    propertyId: Optional[str] = None
    unitId: Optional[str] = None
    technicianId: str
    eventType: str = "repair"
    findings: Optional[str] = None
    symptomCodes: List[str] = []
    resolutionCode: Optional[str] = None
    laborMinutes: Optional[int] = 45
    laborRate: Optional[float] = 85.0
    partsCost: Optional[float] = 0.0
    otherCost: Optional[float] = 0.0
    costBorneBy: Optional[str] = "property"
    isWarrantyClaim: bool = False
    partsUsed: Optional[List[Dict[str, Any]]] = None


class ServiceEventSchema(BaseModel):
    id: str
    assetId: str
    workOrderId: Optional[str] = None
    propertyId: Optional[str] = None
    unitId: Optional[str] = None
    technicianId: str
    eventType: str
    findings: Optional[str] = None
    symptomCodes: List[str] = []
    resolutionCode: Optional[str] = None
    laborMinutes: Optional[int] = None
    laborRate: Optional[float] = None
    laborCost: Optional[float] = None
    partsCost: Optional[float] = None
    otherCost: Optional[float] = None
    totalCost: Optional[float] = None
    costBorneBy: Optional[str] = None
    isWarrantyClaim: bool = False
    occurredAt: datetime

    model_config = ConfigDict(from_attributes=True)


# Assets
class AssetCreate(BaseModel):
    npid: str
    categoryId: str
    manufacturerRaw: Optional[str] = None
    modelRaw: Optional[str] = None
    serialNumber: Optional[str] = None
    currentPropertyId: Optional[str] = None
    currentUnitId: Optional[str] = None
    installDate: Optional[str] = None
    purchaseCost: Optional[float] = 0.0
    notes: Optional[str] = None
    customFields: Optional[Dict[str, Any]] = None


class AssetUpdate(BaseModel):
    status: Optional[str] = None
    condition: Optional[str] = None
    currentPropertyId: Optional[str] = None
    currentUnitId: Optional[str] = None
    notes: Optional[str] = None
    customFields: Optional[Dict[str, Any]] = None


class AssetSchema(BaseModel):
    id: str
    npid: str
    categoryId: str
    assetModelId: Optional[str] = None
    manufacturerRaw: Optional[str] = None
    modelRaw: Optional[str] = None
    serialNumber: Optional[str] = None
    serialConfidence: Optional[str] = "verified"
    status: str = "active"
    condition: Optional[str] = "good"
    currentPropertyId: Optional[str] = None
    currentUnitId: Optional[str] = None
    currentLocationConfirmedAt: Optional[datetime] = None
    installDate: Optional[datetime] = None
    manufactureDate: Optional[datetime] = None
    warrantyExpiresOn: Optional[datetime] = None
    purchaseCost: Optional[float] = 0.0
    expectedLifeMonths: Optional[int] = 120
    lifetimeServiceCost: Optional[float] = 0.0
    serviceEventCount: Optional[int] = 0
    lastServiceAt: Optional[datetime] = None
    notes: Optional[str] = None
    customFields: Optional[Dict[str, Any]] = None
    category: Optional[AssetCategorySchema] = None
    currentProperty: Optional[PropertySchema] = None
    currentUnit: Optional[UnitSchema] = None
    serviceEvents: Optional[List[ServiceEventSchema]] = None

    model_config = ConfigDict(from_attributes=True)


# Work Orders
class WorkOrderNoteCreate(BaseModel):
    author: str
    text: str
    avatar: Optional[str] = None
    type: Optional[str] = "note"


class WorkOrderNoteSchema(BaseModel):
    id: str
    author: str
    avatar: Optional[str] = None
    createdAt: datetime
    text: str
    type: Optional[str] = "note"

    model_config = ConfigDict(from_attributes=True)


class WorkOrderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "normal"
    category: Optional[str] = "HVAC"
    propertyId: str = "prop_sonoran_ridge"
    unitId: Optional[str] = "unit_402"
    assetId: Optional[str] = None
    assetNpid: Optional[str] = None
    assignee: Optional[str] = "Lead Tech Morales"


class WorkOrderUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None
    resolution: Optional[str] = None
    actualCost: Optional[float] = None


class WorkOrderSchema(BaseModel):
    id: str
    number: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    category: Optional[str] = None
    propertyId: str
    propertyName: Optional[str] = None
    unitId: Optional[str] = None
    unitLabel: Optional[str] = None
    assetId: Optional[str] = None
    assetNpid: Optional[str] = None
    assetName: Optional[str] = None
    assignee: Optional[str] = None
    slaDueAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    resolution: Optional[str] = None
    actualCost: Optional[float] = 0.0
    partsRequired: List[str] = []
    notesList: List[WorkOrderNoteSchema] = []

    model_config = ConfigDict(from_attributes=True)


# Maintenance Users
class MaintenanceUserSchema(BaseModel):
    id: str
    userId: str
    email: str
    fullName: str
    phone: Optional[str] = None
    userStatus: str = "active"
    role: str = "technician"
    employmentType: Optional[str] = "employee"
    hourlyLaborRate: Optional[float] = 58.0
    status: str = "active"
    lastSeenAt: Optional[datetime] = None
    invitedAt: datetime
    properties: List[Dict[str, Any]] = []

    model_config = ConfigDict(from_attributes=True)


class InviteUserInput(BaseModel):
    email: str
    fullName: str
    phone: Optional[str] = None
    role: str = "technician"
    employmentType: Optional[str] = "employee"
    hourlyLaborRate: Optional[float] = 58.0
    propertyIds: List[str] = []


class UpdateUserInput(BaseModel):
    role: Optional[str] = None
    employmentType: Optional[str] = None
    hourlyLaborRate: Optional[float] = None
    status: Optional[str] = None
    propertyIds: Optional[List[str]] = None


# Sync Operations
class SyncPushPayload(BaseModel):
    deviceId: str
    clientTimestamp: str
    payloadHash: str
    events: List[Dict[str, Any]] = []
    assets: List[Dict[str, Any]] = []
