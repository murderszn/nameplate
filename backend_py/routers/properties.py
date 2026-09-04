from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="", tags=["Properties"])


@router.get("/properties", response_model=List[schemas.Property])
def list_properties(
    org_id: Optional[str] = Query(None, alias="orgId"),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Property)
    if org_id:
        query = query.filter(models.Property.organization_id == org_id)
    if status:
        query = query.filter(models.Property.status == status)
    return query.all()


@router.get("/properties/{id}", response_model=schemas.Property)
def get_property(id: str, db: Session = Depends(get_db)):
    prop = db.query(models.Property).filter(models.Property.id == id).first()
    if not prop:
        raise HTTPException(status_code=404, detail=f"Property not found: {id}")
    return prop


@router.post("/properties", response_model=schemas.Property, status_code=201)
def create_property(payload: schemas.PropertyCreate, db: Session = Depends(get_db)):
    org_id = payload.org_id or "org_sonoran"
    prop = models.Property(
        organization_id=org_id,
        name=payload.name,
        code=payload.code,
        address_line1=payload.address_line1,
        address_line2=payload.address_line2,
        city=payload.city,
        state=payload.state,
        postal_code=payload.postal_code,
        status=payload.status,
        unit_count_declared=payload.unit_count_declared,
        latitude=payload.latitude,
        longitude=payload.longitude,
        year_built=payload.year_built,
        timezone=payload.timezone or "America/Phoenix",
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


@router.get("/properties/{id}/units", response_model=List[schemas.Unit])
def list_property_units(
    id: str,
    building_id: Optional[str] = Query(None, alias="buildingId"),
    db: Session = Depends(get_db),
):
    prop = db.query(models.Property).filter(models.Property.id == id).first()
    if not prop:
        raise HTTPException(status_code=404, detail=f"Property not found: {id}")

    query = (
        db.query(models.Unit)
        .options(joinedload(models.Unit.building))
        .filter(models.Unit.property_id == id)
    )
    if building_id:
        query = query.filter(models.Unit.building_id == building_id)

    return query.all()


@router.post("/properties/{id}/units", response_model=schemas.Unit, status_code=201)
def create_property_unit(
    id: str,
    payload: schemas.UnitCreate,
    db: Session = Depends(get_db),
):
    prop = db.query(models.Property).filter(models.Property.id == id).first()
    if not prop:
        raise HTTPException(status_code=404, detail=f"Property not found: {id}")

    unit = models.Unit(
        property_id=id,
        building_id=payload.building_id,
        label=payload.label,
        floor=payload.floor,
        bedrooms=payload.bedrooms,
        bathrooms=payload.bathrooms,
        square_feet=payload.square_feet,
        occupancy_status=payload.occupancy_status or "occupied",
        notes=payload.notes,
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.get("/buildings", response_model=List[schemas.Building])
def list_buildings(
    property_id: Optional[str] = Query(None, alias="propertyId"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Building)
    if property_id:
        query = query.filter(models.Building.property_id == property_id)
    return query.all()


@router.get("/units/{id}", response_model=schemas.Unit)
def get_unit(id: str, db: Session = Depends(get_db)):
    unit = (
        db.query(models.Unit)
        .options(joinedload(models.Unit.building))
        .filter(models.Unit.id == id)
        .first()
    )
    if not unit:
        raise HTTPException(status_code=404, detail=f"Unit not found: {id}")
    return unit
