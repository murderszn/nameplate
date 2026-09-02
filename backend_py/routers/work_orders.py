import json
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import WorkOrder, WorkOrderNote, Asset, Property, Unit
from ..schemas import (
    WorkOrderSchema,
    WorkOrderCreate,
    WorkOrderUpdate,
    WorkOrderNoteCreate,
    WorkOrderNoteSchema,
)

router = APIRouter(tags=["work_orders"])


def format_wo_response(wo: WorkOrder, db: Session) -> dict:
    prop = db.query(Property).filter(Property.id == wo.property_id).first()
    unit = db.query(Unit).filter(Unit.id == wo.unit_id).first() if wo.unit_id else None
    asset = db.query(Asset).filter(Asset.id == wo.asset_id).first() if wo.asset_id else None

    return {
        "id": wo.id,
        "number": wo.number,
        "title": wo.title,
        "description": wo.description,
        "status": wo.status,
        "priority": wo.priority,
        "category": wo.category,
        "propertyId": wo.property_id,
        "propertyName": prop.name if prop else "Sonoran Ridge",
        "unitId": wo.unit_id,
        "unitLabel": unit.label if unit else "Unit 402",
        "assetId": wo.asset_id,
        "assetNpid": asset.npid if asset else None,
        "assetName": asset.manufacturer_raw + " " + (asset.model_raw or "") if asset else None,
        "assignee": wo.assignee,
        "slaDueAt": wo.sla_due_at,
        "completedAt": wo.completed_at,
        "resolution": wo.resolution,
        "actualCost": wo.actual_cost,
        "partsRequired": wo.parts_required,
        "notesList": [
            {
                "id": n.id,
                "author": n.author,
                "avatar": n.avatar,
                "createdAt": n.created_at,
                "text": n.text,
                "type": n.note_type,
            }
            for n in sorted(wo.notes, key=lambda x: x.created_at)
        ],
    }


@router.get("/work-orders")
def list_work_orders(
    propertyId: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(WorkOrder)
    if propertyId:
        query = query.filter(WorkOrder.property_id == propertyId)
    if status and status != "all":
        query = query.filter(WorkOrder.status == status)
    if priority and priority != "all":
        query = query.filter(WorkOrder.priority == priority)
    if category and category != "all":
        query = query.filter(WorkOrder.category == category)
    
    rows = query.order_by(WorkOrder.number.desc()).all()
    return [format_wo_response(w, db) for w in rows]


@router.get("/work-orders/{wo_id}")
def get_work_order(wo_id: str, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    return format_wo_response(wo, db)


@router.post("/work-orders")
def create_work_order(payload: WorkOrderCreate, db: Session = Depends(get_db)):
    highest = db.query(WorkOrder).order_by(WorkOrder.number.desc()).first()
    next_num = (highest.number + 1) if highest else 1850
    wo_id = f"wo-{next_num}"

    # Resolve asset if NPID provided
    asset_id = payload.assetId
    if not asset_id and payload.assetNpid:
        found_asset = db.query(Asset).filter(Asset.npid == payload.assetNpid.strip().upper()).first()
        if found_asset:
            asset_id = found_asset.id

    new_wo = WorkOrder(
        id=wo_id,
        number=next_num,
        title=payload.title,
        description=payload.description,
        status="open",
        priority=payload.priority,
        category=payload.category,
        property_id=payload.propertyId,
        unit_id=payload.unitId,
        asset_id=asset_id,
        assignee=payload.assignee,
        sla_due_at=datetime.now(timezone.utc) + timedelta(hours=24 if payload.priority == "normal" else 4),
        parts_required_json="[]",
    )
    db.add(new_wo)
    db.commit()
    db.refresh(new_wo)
    return format_wo_response(new_wo, db)


@router.put("/work-orders/{wo_id}")
def update_work_order(wo_id: str, payload: WorkOrderUpdate, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    if payload.status is not None:
        old_status = wo.status
        wo.status = payload.status
        if payload.status == "completed" and not wo.completed_at:
            wo.completed_at = datetime.now(timezone.utc)
        
        # Add automatic status audit note
        if old_status != payload.status:
            audit_note = WorkOrderNote(
                id=f"note-status-{datetime.now(timezone.utc).timestamp()}",
                work_order_id=wo.id,
                author=wo.assignee or "System Dispatch",
                avatar="S",
                text=f"Status advanced from {old_status.upper()} to {payload.status.upper()}",
                note_type="status_change",
            )
            db.add(audit_note)

    if payload.priority is not None:
        wo.priority = payload.priority
    if payload.assignee is not None:
        wo.assignee = payload.assignee
    if payload.resolution is not None:
        wo.resolution = payload.resolution
    if payload.actualCost is not None:
        wo.actual_cost = payload.actualCost

    db.commit()
    db.refresh(wo)
    return format_wo_response(wo, db)


@router.post("/work-orders/{wo_id}/notes")
def add_work_order_note(wo_id: str, payload: WorkOrderNoteCreate, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    note_id = f"note-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    new_note = WorkOrderNote(
        id=note_id,
        work_order_id=wo.id,
        author=payload.author,
        avatar=payload.avatar or (payload.author[0] if payload.author else "T"),
        text=payload.text,
        note_type=payload.type or "note",
    )
    db.add(new_note)
    db.commit()
    db.refresh(wo)
    return format_wo_response(wo, db)
