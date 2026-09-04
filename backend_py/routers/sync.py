import datetime
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="", tags=["Sync"])


@router.post("/sync/push", response_model=schemas.SyncPushResponse)
def push_sync_batch(payload: schemas.SyncPushRequest, db: Session = Depends(get_db)):
    device_id = payload.device_id
    user_id = payload.user_id

    applied_count = 0
    duplicate_count = 0
    rejected_count = 0
    results: List[schemas.SyncOpResult] = []

    for op in payload.operations:
        # Check if already processed
        existing_op = db.query(models.SyncOp).filter(models.SyncOp.op_id == op.op_id).first()
        if existing_op:
            duplicate_count += 1
            results.append(
                schemas.SyncOpResult(
                    op_id=op.op_id,
                    status="duplicate",
                    entity_type=op.entity_type,
                    entity_id=op.entity_id,
                )
            )
            continue

        try:
            # Process operation based on entity_type and op_type
            if op.entity_type == "asset":
                p = op.payload
                if op.op_type == "create":
                    npid = p.get("npid") or f"NP-{op.op_id[:8].upper()}"
                    asset = models.Asset(
                        id=op.entity_id or f"asset_{op.op_id[:8]}",
                        npid=npid,
                        category_id=p.get("categoryId", p.get("category_id", "cat_hvac")),
                        asset_model_id=p.get("assetModelId", p.get("asset_model_id")),
                        manufacturer_raw=p.get("manufacturerRaw", p.get("manufacturer_raw")),
                        model_raw=p.get("modelRaw", p.get("model_raw")),
                        serial_number=p.get("serialNumber", p.get("serial_number")),
                        status=p.get("status", "active"),
                        condition=p.get("condition", "good"),
                        current_property_id=p.get("currentPropertyId", p.get("current_property_id")),
                        current_unit_id=p.get("currentUnitId", p.get("current_unit_id")),
                        notes=p.get("notes"),
                    )
                    db.add(asset)
                elif op.op_type == "update" and op.entity_id:
                    asset = db.query(models.Asset).filter(models.Asset.id == op.entity_id).first()
                    if asset:
                        for k, v in p.items():
                            if hasattr(asset, k):
                                setattr(asset, k, v)

            elif op.entity_type == "service_event":
                p = op.payload
                event = models.ServiceEvent(
                    id=op.entity_id or f"evt_{op.op_id[:8]}",
                    asset_id=p.get("assetId", p.get("asset_id")),
                    work_order_id=p.get("workOrderId", p.get("work_order_id")),
                    property_id=p.get("propertyId", p.get("property_id")),
                    unit_id=p.get("unitId", p.get("unit_id")),
                    technician_id=p.get("technicianId", p.get("technician_id", "tech_morales")),
                    event_type=p.get("eventType", p.get("event_type", "maintenance")),
                    findings=p.get("findings"),
                    labor_minutes=p.get("laborMinutes", p.get("labor_minutes", 30)),
                    labor_rate=p.get("laborRate", p.get("labor_rate", 65.0)),
                    total_cost=p.get("totalCost", p.get("total_cost", 0.0)),
                )
                db.add(event)

            # Record sync operation
            sync_record = models.SyncOp(
                op_id=op.op_id,
                batch_id=payload.batch_id,
                device_id=device_id,
                user_id=user_id,
                entity_type=op.entity_type,
                entity_id=op.entity_id,
                op_type=op.op_type,
                status="applied",
            )
            sync_record.payload = op.payload
            db.add(sync_record)
            applied_count += 1
            results.append(
                schemas.SyncOpResult(
                    op_id=op.op_id,
                    status="applied",
                    entity_type=op.entity_type,
                    entity_id=op.entity_id,
                )
            )

        except Exception as e:
            rejected_count += 1
            sync_record = models.SyncOp(
                op_id=op.op_id,
                batch_id=payload.batch_id,
                device_id=device_id,
                user_id=user_id,
                entity_type=op.entity_type,
                entity_id=op.entity_id,
                op_type=op.op_type,
                status="rejected",
            )
            sync_record.error = {"message": str(e)}
            sync_record.payload = op.payload
            db.add(sync_record)
            results.append(
                schemas.SyncOpResult(
                    op_id=op.op_id,
                    status="rejected",
                    entity_type=op.entity_type,
                    entity_id=op.entity_id,
                    error=str(e),
                )
            )

    db.commit()

    return schemas.SyncPushResponse(
        batch_id=payload.batch_id,
        processed_count=len(payload.operations),
        applied_count=applied_count,
        duplicate_count=duplicate_count,
        rejected_count=rejected_count,
        results=results,
    )


@router.get("/sync/status", response_model=schemas.SyncStatusResponse)
def get_sync_status(db: Session = Depends(get_db)):
    synced_count = db.query(models.SyncBatch).count()
    return schemas.SyncStatusResponse(
        status="healthy",
        server_time=datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
        last_sync_cursor=synced_count,
        pending_reconciliations=0,
        active_devices=1,
        synced_ops_count=synced_count,
    )
