import json
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ServiceEvent, Asset, WorkOrder, PartRecord
from ..schemas import ServiceEventSchema, ServiceEventCreate

router = APIRouter(tags=["service"])


@router.get("/service-events")
def list_service_events(
    assetId: Optional[str] = None,
    propertyId: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(ServiceEvent)
    if assetId:
        query = query.filter(ServiceEvent.asset_id == assetId)
    if propertyId:
        query = query.filter(ServiceEvent.property_id == propertyId)
    
    events = query.order_by(ServiceEvent.occurred_at.desc()).all()
    return [
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
        for se in events
    ]


@router.post("/service-events")
def create_service_event(payload: ServiceEventCreate, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == payload.assetId).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    labor_rate = payload.laborRate or 85.0
    labor_mins = payload.laborMinutes or 45
    labor_cost = (labor_mins / 60.0) * labor_rate
    parts_cost = payload.partsCost or 0.0
    other_cost = payload.otherCost or 0.0
    total_cost = labor_cost + parts_cost + other_cost

    event_id = f"se-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    now = datetime.now(timezone.utc)

    new_event = ServiceEvent(
        id=event_id,
        asset_id=payload.assetId,
        work_order_id=payload.workOrderId,
        property_id=payload.propertyId or asset.current_property_id,
        unit_id=payload.unitId or asset.current_unit_id,
        technician_id=payload.technicianId,
        event_type=payload.eventType,
        findings=payload.findings,
        symptom_codes_json=json.dumps(payload.symptomCodes or []),
        resolution_code=payload.resolutionCode,
        labor_minutes=labor_mins,
        labor_rate=labor_rate,
        labor_cost=labor_cost,
        parts_cost=parts_cost,
        other_cost=other_cost,
        total_cost=total_cost,
        cost_borne_by=payload.costBorneBy,
        is_warranty_claim=payload.isWarrantyClaim,
        occurred_at=now,
    )
    db.add(new_event)

    # Update Asset Lifetime Maintenance Stats
    asset.last_service_at = now
    asset.lifetime_service_cost = (asset.lifetime_service_cost or 0.0) + total_cost
    asset.service_event_count = (asset.service_event_count or 0) + 1
    if payload.resolutionCode in ["fixed", "part_replaced"]:
        asset.status = "active"
        asset.condition = "good"

    # Close Work Order if provided
    if payload.workOrderId:
        wo = db.query(WorkOrder).filter(WorkOrder.id == payload.workOrderId).first()
        if wo:
            wo.status = "completed"
            wo.completed_at = now
            wo.actual_cost = total_cost
            if payload.findings:
                wo.resolution = payload.findings

    db.commit()
    db.refresh(new_event)

    return {
        "id": new_event.id,
        "assetId": new_event.asset_id,
        "workOrderId": new_event.work_order_id,
        "totalCost": new_event.total_cost,
        "occurredAt": new_event.occurred_at,
        "status": "recorded",
    }
