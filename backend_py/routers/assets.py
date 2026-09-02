import json
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Asset, AssetCategory, AssetModel, Property, Unit, ServiceEvent, PartRecord
from ..schemas import AssetSchema, AssetCreate, AssetUpdate, AssetCategorySchema, AssetModelSchema

router = APIRouter(tags=["assets"])


def format_asset_response(asset: Asset) -> dict:
    return {
        "id": asset.id,
        "npid": asset.npid,
        "categoryId": asset.category_id,
        "assetModelId": asset.asset_model_id,
        "manufacturerRaw": asset.manufacturer_raw,
        "modelRaw": asset.model_raw,
        "serialNumber": asset.serial_number,
        "serialConfidence": asset.serial_confidence,
        "status": asset.status,
        "condition": asset.condition,
        "currentPropertyId": asset.current_property_id,
        "currentUnitId": asset.current_unit_id,
        "currentLocationConfirmedAt": asset.current_location_confirmed_at,
        "installDate": asset.install_date,
        "manufactureDate": asset.manufacture_date,
        "warrantyExpiresOn": asset.warranty_expires_on,
        "purchaseCost": asset.purchase_cost,
        "expectedLifeMonths": asset.expected_life_months,
        "lifetimeServiceCost": asset.lifetime_service_cost,
        "serviceEventCount": asset.service_event_count,
        "lastServiceAt": asset.last_service_at,
        "notes": asset.notes,
        "customFields": asset.custom_fields,
        "category": {
            "id": asset.category.id,
            "key": asset.category.key,
            "displayName": asset.category.display_name,
            "defaultUsefulLifeMonths": asset.category.default_useful_life_months,
            "defaultReplacementCost": asset.category.default_replacement_cost,
        } if asset.category else None,
        "currentProperty": {
            "id": asset.current_property.id,
            "name": asset.current_property.name,
            "code": asset.current_property.code,
            "city": asset.current_property.city,
            "state": asset.current_property.state,
        } if asset.current_property else None,
        "currentUnit": {
            "id": asset.unit.id,
            "propertyId": asset.unit.property_id,
            "label": asset.unit.label,
            "occupancyStatus": asset.unit.occupancy_status,
        } if asset.unit else None,
        "serviceEvents": [
            {
                "id": se.id,
                "assetId": se.asset_id,
                "workOrderId": se.work_order_id,
                "propertyId": se.property_id,
                "unitId": se.unit_id,
                "technicianId": se.technician_id,
                "eventType": se.event_type,
                "findings": se.findings,
                "symptomCodes": se.symptom_codes,
                "resolutionCode": se.resolution_code,
                "laborMinutes": se.labor_minutes,
                "laborRate": se.labor_rate,
                "laborCost": se.labor_cost,
                "partsCost": se.parts_cost,
                "otherCost": se.other_cost,
                "totalCost": se.total_cost,
                "costBorneBy": se.cost_borne_by,
                "isWarrantyClaim": se.is_warranty_claim,
                "occurredAt": se.occurred_at,
            }
            for se in asset.service_events
        ] if asset.service_events else [],
    }


@router.get("/categories", response_model=List[AssetCategorySchema])
def list_categories(db: Session = Depends(get_db)):
    return db.query(AssetCategory).all()


@router.get("/assets")
def list_assets(
    propertyId: Optional[str] = None,
    categoryId: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Asset)
    if propertyId:
        query = query.filter(Asset.current_property_id == propertyId)
    if categoryId:
        query = query.filter(Asset.category_id == categoryId)
    if status:
        query = query.filter(Asset.status == status)
    
    assets = query.all()
    if search:
        s = search.lower().strip()
        assets = [
            a for a in assets
            if s in a.npid.lower()
            or (a.manufacturer_raw and s in a.manufacturer_raw.lower())
            or (a.model_raw and s in a.model_raw.lower())
            or (a.serial_number and s in a.serial_number.lower())
            or (a.category and s in a.category.display_name.lower())
            or (a.unit and s in a.unit.label.lower())
        ]
    return [format_asset_response(a) for a in assets]


@router.get("/assets/{asset_id}")
def get_asset(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        # Fallback to check if ID passed was NPID
        asset = db.query(Asset).filter(Asset.npid == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return format_asset_response(asset)


@router.get("/assets/lookup/{npid}")
def lookup_asset_by_npid(npid: str, db: Session = Depends(get_db)):
    normalized = npid.strip().upper()
    asset = db.query(Asset).filter(Asset.npid == normalized).first()
    if not asset:
        # Try stripped dashes
        for a in db.query(Asset).all():
            if a.npid.replace("-", "") == normalized.replace("-", ""):
                asset = a
                break
    if not asset:
        raise HTTPException(status_code=404, detail=f"No asset tag registered for '{npid}'")
    return format_asset_response(asset)


@router.post("/assets")
def create_asset(payload: AssetCreate, db: Session = Depends(get_db)):
    existing = db.query(Asset).filter(Asset.npid == payload.npid).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Asset tag {payload.npid} is already registered.")
    
    asset_id = f"asset_{payload.npid.lower().replace('-', '_')}"
    new_asset = Asset(
        id=asset_id,
        npid=payload.npid,
        category_id=payload.categoryId,
        manufacturer_raw=payload.manufacturerRaw,
        model_raw=payload.modelRaw,
        serial_number=payload.serialNumber,
        current_property_id=payload.currentPropertyId,
        current_unit_id=payload.currentUnitId,
        purchase_cost=payload.purchaseCost or 0.0,
        notes=payload.notes,
        custom_fields_json=json.dumps(payload.customFields or {}),
        current_location_confirmed_at=datetime.now(timezone.utc),
    )
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    return format_asset_response(new_asset)


@router.put("/assets/{asset_id}")
def update_asset(asset_id: str, payload: AssetUpdate, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if payload.status is not None:
        asset.status = payload.status
    if payload.condition is not None:
        asset.condition = payload.condition
    if payload.currentPropertyId is not None:
        asset.current_property_id = payload.currentPropertyId
    if payload.currentUnitId is not None:
        asset.current_unit_id = payload.currentUnitId
        asset.current_location_confirmed_at = datetime.now(timezone.utc)
    if payload.notes is not None:
        asset.notes = payload.notes
    if payload.customFields is not None:
        merged = {**asset.custom_fields, **payload.customFields}
        asset.custom_fields = merged

    db.commit()
    db.refresh(asset)
    return format_asset_response(asset)
