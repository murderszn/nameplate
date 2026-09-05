import datetime
import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from .. import models, schemas
from ..supabase_sync import sync_work_order_to_supabase

router = APIRouter(prefix="", tags=["Work Orders"])


def hydrate_work_order(wo: models.WorkOrder) -> schemas.WorkOrder:
    prop_name = wo.property.name if wo.property else None
    unit_lbl = f"Unit {wo.unit.label}" if wo.unit else None
    asset_np = wo.asset.npid if wo.asset else None
    asset_nm = None
    if wo.asset:
        if wo.asset.asset_model and wo.asset.asset_model.display_name:
            asset_nm = wo.asset.asset_model.display_name
        elif wo.asset.manufacturer_raw or wo.asset.model_raw:
            asset_nm = f"{wo.asset.manufacturer_raw or ''} {wo.asset.model_raw or ''}".strip()

    notes = []
    if wo.notes:
        for n in wo.notes:
            notes.append(
                schemas.WorkOrderNote(
                    id=n.id,
                    author=n.author,
                    avatar=n.avatar,
                    created_at=n.created_at,
                    text=n.text,
                    type=n.type or "note",
                )
            )

    return schemas.WorkOrder(
        id=wo.id,
        number=wo.number,
        title=wo.title,
        description=wo.description,
        status=wo.status,
        priority=wo.priority,
        category=wo.category,
        property_id=wo.property_id,
        property_name=prop_name,
        unit_id=wo.unit_id,
        unit_label=unit_lbl,
        asset_id=wo.asset_id,
        asset_npid=asset_np,
        asset_name=asset_nm,
        assignee=wo.assignee or "Unassigned",
        sla_due_at=wo.sla_due_at,
        completed_at=wo.completed_at,
        resolution=wo.resolution,
        actual_cost=wo.actual_cost,
        parts_required=wo.parts_required,
        notes_list=notes,
    )


def get_work_order_query(db: Session):
    return db.query(models.WorkOrder).options(
        joinedload(models.WorkOrder.property),
        joinedload(models.WorkOrder.unit),
        joinedload(models.WorkOrder.asset).joinedload(models.Asset.asset_model),
        joinedload(models.WorkOrder.notes),
    )


@router.get("/work-orders", response_model=List[schemas.WorkOrder])
def list_work_orders(
    property_id: Optional[str] = Query(None, alias="propertyId"),
    unit_id: Optional[str] = Query(None, alias="unitId"),
    asset_id: Optional[str] = Query(None, alias="assetId"),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assignee: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = get_work_order_query(db)

    if property_id:
        query = query.filter(models.WorkOrder.property_id == property_id)
    if unit_id:
        query = query.filter(models.WorkOrder.unit_id == unit_id)
    if asset_id:
        query = query.filter(models.WorkOrder.asset_id == asset_id)
    if status:
        query = query.filter(models.WorkOrder.status == status)
    if priority:
        query = query.filter(models.WorkOrder.priority == priority)
    if assignee:
        query = query.filter(models.WorkOrder.assignee.ilike(f"%{assignee}%"))

    wos = query.order_by(models.WorkOrder.number.desc()).all()
    return [hydrate_work_order(w) for w in wos]


@router.get("/work-orders/{id}", response_model=schemas.WorkOrder)
def get_work_order(id: str, db: Session = Depends(get_db)):
    query = get_work_order_query(db)

    wo = None
    if id.isdigit():
        wo = query.filter(models.WorkOrder.number == int(id)).first()
    if not wo:
        wo = query.filter(models.WorkOrder.id == id).first()

    if not wo:
        raise HTTPException(status_code=404, detail=f"Work order not found: {id}")

    return hydrate_work_order(wo)


@router.post("/work-orders", response_model=schemas.WorkOrder, status_code=201)
def create_work_order(payload: schemas.WorkOrderCreate, db: Session = Depends(get_db)):
    max_num = db.query(func.max(models.WorkOrder.number)).scalar() or 1050
    next_num = max_num + 1

    sla_due = None
    if payload.sla_due_at:
        try:
            sla_due = datetime.datetime.fromisoformat(payload.sla_due_at.replace("Z", "+00:00"))
        except Exception:
            pass

    wo = models.WorkOrder(
        id=f"wo_{next_num}",
        property_id=payload.property_id,
        number=next_num,
        title=payload.title,
        description=payload.description,
        status=payload.status or "open",
        priority=payload.priority or "normal",
        category=payload.category or "General",
        unit_id=payload.unit_id,
        asset_id=payload.asset_id,
        assignee=payload.assignee or "Unassigned",
        sla_due_at=sla_due,
        actual_cost=payload.actual_cost or 0.0,
    )
    if payload.parts_required:
        wo.parts_required = payload.parts_required

    db.add(wo)
    db.flush()

    # Add initial note
    if payload.notes_list:
        for n in payload.notes_list:
            note_row = models.WorkOrderNote(
                work_order_id=wo.id,
                author=n.author or "HQ Dispatch",
                avatar=n.avatar,
                text=n.text,
                type=n.type or "note",
            )
            db.add(note_row)
    else:
        init_note = models.WorkOrderNote(
            work_order_id=wo.id,
            author="HQ Dispatch",
            text="Work order created.",
            type="note",
        )
        db.add(init_note)

    db.commit()

    reloaded = get_work_order_query(db).filter(models.WorkOrder.id == wo.id).first()
    try:
        sync_work_order_to_supabase({
            "id": wo.id,
            "number": wo.number,
            "title": wo.title,
            "description": wo.description,
            "status": wo.status,
            "priority": wo.priority,
            "property_id": wo.property_id,
            "unit_id": wo.unit_id,
            "asset_id": wo.asset_id,
            "actual_cost": wo.actual_cost,
        })
    except Exception as e:
        print(f"[Supabase Sync] Warning on work order create: {e}")
    return hydrate_work_order(reloaded)


@router.put("/work-orders/{id}", response_model=schemas.WorkOrder)
def update_work_order(id: str, payload: schemas.WorkOrderUpdate, db: Session = Depends(get_db)):
    wo = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not wo and id.isdigit():
        wo = db.query(models.WorkOrder).filter(models.WorkOrder.number == int(id)).first()

    if not wo:
        raise HTTPException(status_code=404, detail=f"Work order not found: {id}")

    data = payload.model_dump(exclude_unset=True, by_alias=False)
    for field, val in data.items():
        if val is not None:
            if field in ("sla_due_at", "completed_at") and isinstance(val, str):
                try:
                    val = datetime.datetime.fromisoformat(val.replace("Z", "+00:00"))
                except Exception:
                    continue
            if field == "parts_required":
                wo.parts_required = val
            elif hasattr(wo, field):
                setattr(wo, field, val)

    wo.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()

    reloaded = get_work_order_query(db).filter(models.WorkOrder.id == wo.id).first()
    try:
        sync_work_order_to_supabase({
            "id": wo.id,
            "number": wo.number,
            "title": wo.title,
            "description": wo.description,
            "status": wo.status,
            "priority": wo.priority,
            "property_id": wo.property_id,
            "unit_id": wo.unit_id,
            "asset_id": wo.asset_id,
            "actual_cost": wo.actual_cost,
        })
    except Exception as e:
        print(f"[Supabase Sync] Warning on work order update: {e}")
    return hydrate_work_order(reloaded)


@router.post("/work-orders/{id}/notes", response_model=schemas.WorkOrder)
def add_work_order_note(
    id: str,
    payload: schemas.WorkOrderNoteCreate,
    db: Session = Depends(get_db),
):
    wo = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not wo and id.isdigit():
        wo = db.query(models.WorkOrder).filter(models.WorkOrder.number == int(id)).first()

    if not wo:
        raise HTTPException(status_code=404, detail=f"Work order not found: {id}")

    note_row = models.WorkOrderNote(
        work_order_id=wo.id,
        author=payload.author or "Tech Morales",
        avatar=payload.avatar,
        text=payload.text,
        type=payload.type or "note",
    )
    db.add(note_row)
    wo.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()

    reloaded = get_work_order_query(db).filter(models.WorkOrder.id == wo.id).first()
    return hydrate_work_order(reloaded)


@router.post("/work-orders/{id}/status", response_model=schemas.WorkOrder)
def update_work_order_status(
    id: str,
    payload: schemas.WorkOrderStatusUpdate,
    db: Session = Depends(get_db),
):
    wo = db.query(models.WorkOrder).filter(models.WorkOrder.id == id).first()
    if not wo and id.isdigit():
        wo = db.query(models.WorkOrder).filter(models.WorkOrder.number == int(id)).first()

    if not wo:
        raise HTTPException(status_code=404, detail=f"Work order not found: {id}")

    old_status = wo.status
    wo.status = payload.status

    if payload.resolution is not None:
        wo.resolution = payload.resolution
    if payload.actual_cost is not None:
        wo.actual_cost = payload.actual_cost

    if payload.status == "completed" and not wo.completed_at:
        wo.completed_at = datetime.datetime.now(datetime.timezone.utc)

    # Append status change note
    note_text = payload.note or f"Status changed from {old_status} to {payload.status}."
    status_note = models.WorkOrderNote(
        work_order_id=wo.id,
        author=payload.author or "HQ Dispatch",
        text=note_text,
        type="status_change",
    )
    db.add(status_note)
    wo.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()

    reloaded = get_work_order_query(db).filter(models.WorkOrder.id == wo.id).first()
    try:
        sync_work_order_to_supabase({
            "id": wo.id,
            "number": wo.number,
            "title": wo.title,
            "description": wo.description,
            "status": wo.status,
            "priority": wo.priority,
            "property_id": wo.property_id,
            "unit_id": wo.unit_id,
            "asset_id": wo.asset_id,
            "actual_cost": wo.actual_cost,
        })
    except Exception as e:
        print(f"[Supabase Sync] Warning on status update: {e}")
    return hydrate_work_order(reloaded)
