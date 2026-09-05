import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from .. import models, schemas
from ..qr_utils import mint_npid, normalize_crockford
from ..supabase_sync import sync_asset_to_supabase

router = APIRouter(prefix="", tags=["Assets"])


def get_asset_query(db: Session):
    return db.query(models.Asset).options(
        joinedload(models.Asset.category),
        joinedload(models.Asset.asset_model),
        joinedload(models.Asset.current_property),
        joinedload(models.Asset.unit).joinedload(models.Unit.building),
        joinedload(models.Asset.parts_installed),
        joinedload(models.Asset.parts_sourced),
        joinedload(models.Asset.service_events),
    )


@router.get("/categories", response_model=List[schemas.AssetCategory])
def list_categories(db: Session = Depends(get_db)):
    return db.query(models.AssetCategory).all()


@router.get("/assets", response_model=List[schemas.Asset])
def list_assets(
    property_id: Optional[str] = Query(None, alias="propertyId"),
    unit_id: Optional[str] = Query(None, alias="unitId"),
    status: Optional[str] = None,
    category_id: Optional[str] = Query(None, alias="categoryId"),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = get_asset_query(db).filter(models.Asset.deleted_at.is_(None))

    if property_id:
        query = query.filter(models.Asset.current_property_id == property_id)
    if unit_id:
        query = query.filter(models.Asset.current_unit_id == unit_id)
    if status:
        query = query.filter(models.Asset.status == status)
    if category_id:
        query = query.filter(models.Asset.category_id == category_id)
    if search:
        s = f"%{search.lower()}%"
        query = query.filter(
            or_(
                models.Asset.npid.ilike(s),
                models.Asset.manufacturer_raw.ilike(s),
                models.Asset.model_raw.ilike(s),
                models.Asset.serial_number.ilike(s),
                models.Asset.notes.ilike(s),
            )
        )

    return query.all()


@router.get("/assets/{id}", response_model=schemas.Asset)
def get_asset(id: str, db: Session = Depends(get_db)):
    asset = (
        get_asset_query(db)
        .filter(
            or_(models.Asset.id == id, models.Asset.npid == id),
            models.Asset.deleted_at.is_(None),
        )
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset not found: {id}")
    return asset


@router.get("/assets/lookup/{npid}", response_model=schemas.Asset)
def lookup_asset(npid: str, db: Session = Depends(get_db)):
    clean_target = normalize_crockford(npid)
    
    # Try exact match first
    asset = (
        get_asset_query(db)
        .filter(
            or_(models.Asset.npid == npid, models.Asset.npid == f"NP-{clean_target}"),
            models.Asset.deleted_at.is_(None),
        )
        .first()
    )

    if not asset:
        # Check all assets for normalized crockford comparison
        all_assets = get_asset_query(db).filter(models.Asset.deleted_at.is_(None)).all()
        for a in all_assets:
            if normalize_crockford(a.npid) == clean_target:
                asset = a
                break

    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset not found with code: {npid}")

    return asset


@router.post("/assets", response_model=schemas.Asset, status_code=201)
def create_asset(payload: schemas.AssetCreate, db: Session = Depends(get_db)):
    npid = payload.npid or mint_npid()

    # Check for duplicate NPID
    existing = db.query(models.Asset).filter(models.Asset.npid == npid).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Asset with NPID {npid} already exists")

    install_date = None
    if payload.install_date:
        try:
            install_date = datetime.datetime.fromisoformat(payload.install_date.replace("Z", "+00:00"))
        except Exception:
            pass

    manufacture_date = None
    if payload.manufacture_date:
        try:
            manufacture_date = datetime.datetime.fromisoformat(payload.manufacture_date.replace("Z", "+00:00"))
        except Exception:
            pass

    warranty_expires_on = None
    if payload.warranty_expires_on:
        try:
            warranty_expires_on = datetime.datetime.fromisoformat(payload.warranty_expires_on.replace("Z", "+00:00"))
        except Exception:
            pass

    asset = models.Asset(
        npid=npid,
        category_id=payload.category_id,
        asset_model_id=payload.asset_model_id,
        manufacturer_raw=payload.manufacturer_raw,
        model_raw=payload.model_raw,
        serial_number=payload.serial_number,
        serial_confidence=payload.serial_confidence or "verified",
        status=payload.status or "active",
        condition=payload.condition or "good",
        current_property_id=payload.current_property_id,
        current_unit_id=payload.current_unit_id,
        current_location_confirmed_at=datetime.datetime.now(datetime.timezone.utc),
        install_date=install_date,
        manufacture_date=manufacture_date,
        warranty_expires_on=warranty_expires_on,
        purchase_cost=payload.purchase_cost or 0.0,
        expected_life_months=payload.expected_life_months or 120,
        notes=payload.notes,
    )
    if payload.custom_fields:
        asset.custom_fields = payload.custom_fields

    db.add(asset)
    db.commit()

    try:
        sync_asset_to_supabase({
            "id": asset.id,
            "npid": asset.npid,
            "category_id": asset.category_id,
            "manufacturer_raw": asset.manufacturer_raw,
            "model_raw": asset.model_raw,
            "serial_number": asset.serial_number,
            "status": asset.status,
            "condition": asset.condition,
            "current_property_id": asset.current_property_id,
            "current_unit_id": asset.current_unit_id,
            "notes": asset.notes,
        })
    except Exception as e:
        print(f"[Supabase Sync] Warning on asset create: {e}")

    return get_asset_query(db).filter(models.Asset.id == asset.id).first()


@router.put("/assets/{id}", response_model=schemas.Asset)
def update_asset(id: str, payload: schemas.AssetUpdate, db: Session = Depends(get_db)):
    asset = db.query(models.Asset).filter(models.Asset.id == id, models.Asset.deleted_at.is_(None)).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset not found: {id}")

    data = payload.model_dump(exclude_unset=True, by_alias=False)

    for field, val in data.items():
        if val is not None:
            if field in ("install_date", "manufacture_date", "warranty_expires_on", "current_location_confirmed_at"):
                if isinstance(val, str):
                    try:
                        val = datetime.datetime.fromisoformat(val.replace("Z", "+00:00"))
                    except Exception:
                        continue
            if field == "custom_fields":
                asset.custom_fields = val
            elif hasattr(asset, field):
                setattr(asset, field, val)

    asset.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()

    try:
        sync_asset_to_supabase({
            "id": asset.id,
            "npid": asset.npid,
            "category_id": asset.category_id,
            "manufacturer_raw": asset.manufacturer_raw,
            "model_raw": asset.model_raw,
            "serial_number": asset.serial_number,
            "status": asset.status,
            "condition": asset.condition,
            "current_property_id": asset.current_property_id,
            "current_unit_id": asset.current_unit_id,
            "notes": asset.notes,
        })
    except Exception as e:
        print(f"[Supabase Sync] Warning on asset update: {e}")

    return get_asset_query(db).filter(models.Asset.id == asset.id).first()


@router.delete("/assets/{id}")
def delete_asset(id: str, db: Session = Depends(get_db)):
    asset = db.query(models.Asset).filter(models.Asset.id == id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset not found: {id}")

    asset.deleted_at = datetime.datetime.now(datetime.timezone.utc)
    asset.status = "disposed"
    db.commit()

    try:
        sync_asset_to_supabase({
            "id": asset.id,
            "npid": asset.npid,
            "category_id": asset.category_id,
            "status": "disposed",
            "current_property_id": asset.current_property_id,
            "current_unit_id": asset.current_unit_id,
        })
    except Exception as e:
        print(f"[Supabase Sync] Warning on asset delete: {e}")

    return {"status": "success", "message": f"Asset {id} marked as disposed/deleted"}
