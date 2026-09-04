import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="", tags=["Service Events"])


def hydrate_service_event(ev: models.ServiceEvent) -> schemas.ServiceEvent:
    tech = ev.technician_info or {"id": ev.technician_id, "user": {"fullName": "J. Morales"}}
    wo_info = ev.work_order_info
    if not wo_info and ev.work_order:
        wo_info = {
            "id": ev.work_order.id,
            "number": ev.work_order.number,
            "title": ev.work_order.title,
        }

    return schemas.ServiceEvent(
        id=ev.id,
        asset_id=ev.asset_id,
        work_order_id=ev.work_order_id,
        property_id=ev.property_id,
        unit_id=ev.unit_id,
        technician_id=ev.technician_id,
        event_type=ev.event_type,
        findings=ev.findings,
        symptom_codes=ev.symptom_codes or [],
        resolution_code=ev.resolution_code,
        labor_minutes=ev.labor_minutes,
        labor_rate=ev.labor_rate,
        labor_cost=ev.labor_cost,
        parts_cost=ev.parts_cost,
        other_cost=ev.other_cost,
        total_cost=ev.total_cost,
        cost_borne_by=ev.cost_borne_by,
        is_warranty_claim=ev.is_warranty_claim,
        occurred_at=ev.occurred_at,
        technician=tech,
        work_order=wo_info,
        part_usages=ev.part_usages or [],
    )


@router.get("/service-events", response_model=List[schemas.ServiceEvent])
def list_service_events(
    asset_id: Optional[str] = Query(None, alias="assetId"),
    work_order_id: Optional[str] = Query(None, alias="workOrderId"),
    property_id: Optional[str] = Query(None, alias="propertyId"),
    unit_id: Optional[str] = Query(None, alias="unitId"),
    technician_id: Optional[str] = Query(None, alias="technicianId"),
    db: Session = Depends(get_db),
):
    query = db.query(models.ServiceEvent).options(
        joinedload(models.ServiceEvent.work_order),
        joinedload(models.ServiceEvent.asset),
    )

    if asset_id:
        query = query.filter(models.ServiceEvent.asset_id == asset_id)
    if work_order_id:
        query = query.filter(models.ServiceEvent.work_order_id == work_order_id)
    if property_id:
        query = query.filter(models.ServiceEvent.property_id == property_id)
    if unit_id:
        query = query.filter(models.ServiceEvent.unit_id == unit_id)
    if technician_id:
        query = query.filter(models.ServiceEvent.technician_id == technician_id)

    events = query.order_by(models.ServiceEvent.occurred_at.desc()).all()
    return [hydrate_service_event(e) for e in events]


@router.get("/service-events/{id}", response_model=schemas.ServiceEvent)
def get_service_event(id: str, db: Session = Depends(get_db)):
    event = (
        db.query(models.ServiceEvent)
        .options(
            joinedload(models.ServiceEvent.work_order),
            joinedload(models.ServiceEvent.asset),
        )
        .filter(models.ServiceEvent.id == id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail=f"Service event not found: {id}")
    return hydrate_service_event(event)


@router.post("/service-events", response_model=schemas.ServiceEvent, status_code=201)
def create_service_event(
    payload: schemas.ServiceEventCreate,
    db: Session = Depends(get_db),
):
    asset = db.query(models.Asset).filter(models.Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset not found: {payload.asset_id}")

    prop_id = payload.property_id or asset.current_property_id
    unit_id = payload.unit_id or asset.current_unit_id

    labor_mins = payload.labor_minutes or 0
    labor_rate = payload.labor_rate or 65.0
    labor_cost = round((labor_mins / 60.0) * labor_rate, 2)
    parts_cost = round(payload.parts_cost or 0.0, 2)
    other_cost = round(payload.other_cost or 0.0, 2)
    total_cost = round(labor_cost + parts_cost + other_cost, 2)

    occurred_at = datetime.datetime.now(datetime.timezone.utc)
    if payload.occurred_at:
        try:
            occurred_at = datetime.datetime.fromisoformat(payload.occurred_at.replace("Z", "+00:00"))
        except Exception:
            pass

    event = models.ServiceEvent(
        asset_id=payload.asset_id,
        work_order_id=payload.work_order_id,
        property_id=prop_id,
        unit_id=unit_id,
        technician_id=payload.technician_id,
        event_type=payload.event_type,
        findings=payload.findings,
        resolution_code=payload.resolution_code,
        labor_minutes=labor_mins,
        labor_rate=labor_rate,
        labor_cost=labor_cost,
        parts_cost=parts_cost,
        other_cost=other_cost,
        total_cost=total_cost,
        cost_borne_by=payload.cost_borne_by or "owner",
        is_warranty_claim=payload.is_warranty_claim,
        occurred_at=occurred_at,
    )
    if payload.symptom_codes:
        event.symptom_codes = payload.symptom_codes
    if payload.part_usages:
        event.part_usages = payload.part_usages
    event.technician_info = {"id": payload.technician_id, "user": {"fullName": "J. Morales"}}

    db.add(event)

    # Roll up onto asset
    asset.service_event_count = (asset.service_event_count or 0) + 1
    asset.lifetime_service_cost = round((asset.lifetime_service_cost or 0) + total_cost, 2)
    asset.last_service_at = occurred_at
    if payload.resolution_code == "fixed" and asset.status in ("needs_repair", "in_repair"):
        asset.status = "active"

    db.commit()

    reloaded = (
        db.query(models.ServiceEvent)
        .options(
            joinedload(models.ServiceEvent.work_order),
            joinedload(models.ServiceEvent.asset),
        )
        .filter(models.ServiceEvent.id == event.id)
        .first()
    )
    return hydrate_service_event(reloaded)
