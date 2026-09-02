from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Property, Unit, Building, Organization
from ..schemas import PropertySchema, PropertyCreate, UnitSchema, UnitCreate, BuildingSchema, OrganizationSchema

router = APIRouter(tags=["properties"])


def format_property(p: Property) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "code": p.code,
        "addressLine1": p.address_line1,
        "city": p.city,
        "state": p.state,
        "postalCode": p.postal_code,
        "status": p.status,
        "unitCountDeclared": p.unit_count_declared,
        "latitude": p.latitude,
        "longitude": p.longitude,
        "yearBuilt": p.year_built,
        "timezone": p.timezone,
    }


def format_unit(u: Unit) -> dict:
    return {
        "id": u.id,
        "propertyId": u.property_id,
        "buildingId": u.building_id,
        "label": u.label,
        "floor": u.floor,
        "bedrooms": u.bedrooms,
        "bathrooms": u.bathrooms,
        "squareFeet": u.square_feet,
        "occupancyStatus": u.occupancy_status,
    }


@router.get("/org", response_model=OrganizationSchema)
def get_organization(db: Session = Depends(get_db)):
    org = db.query(Organization).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.get("/properties")
def list_properties(db: Session = Depends(get_db)):
    props = db.query(Property).all()
    return [format_property(p) for p in props]


@router.get("/properties/{property_id}")
def get_property(property_id: str, db: Session = Depends(get_db)):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return format_property(prop)


@router.get("/properties/{property_id}/units")
def list_property_units(property_id: str, db: Session = Depends(get_db)):
    units = db.query(Unit).filter(Unit.property_id == property_id).all()
    return [format_unit(u) for u in units]


@router.get("/properties/{property_id}/buildings")
def list_property_buildings(property_id: str, db: Session = Depends(get_db)):
    buildings = db.query(Building).filter(Building.property_id == property_id).all()
    return [
        {"id": b.id, "propertyId": b.property_id, "name": b.name, "code": b.code, "floors": b.floors}
        for b in buildings
    ]


@router.post("/properties", response_model=PropertySchema)
def create_property(payload: PropertyCreate, db: Session = Depends(get_db)):
    prop_id = payload.id or f"prop_{payload.name.lower().replace(' ', '_')}"
    new_prop = Property(
        id=prop_id,
        name=payload.name,
        code=payload.code,
        address_line1=payload.addressLine1,
        city=payload.city,
        state=payload.state,
        postal_code=payload.postalCode,
        unit_count_declared=payload.unitCountDeclared,
        latitude=payload.latitude,
        longitude=payload.longitude,
        year_built=payload.yearBuilt,
    )
    db.add(new_prop)
    db.commit()
    db.refresh(new_prop)
    return new_prop


@router.post("/properties/{property_id}/units", response_model=UnitSchema)
def create_unit(property_id: str, payload: UnitCreate, db: Session = Depends(get_db)):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    unit_id = payload.id or f"unit_{property_id}_{payload.label.lower().replace(' ', '_')}"
    new_unit = Unit(
        id=unit_id,
        property_id=property_id,
        label=payload.label,
        floor=payload.floor,
        bedrooms=payload.bedrooms,
        bathrooms=payload.bathrooms,
        square_feet=payload.squareFeet,
        occupancy_status=payload.occupancyStatus,
    )
    db.add(new_unit)
    db.commit()
    db.refresh(new_unit)
    return new_unit
