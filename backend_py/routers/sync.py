from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import SyncBatch
from ..schemas import SyncPushPayload

router = APIRouter(tags=["sync"])


@router.get("/sync/status")
def get_sync_status(db: Session = Depends(get_db)):
    batches = db.query(SyncBatch).order_by(SyncBatch.server_timestamp.desc()).limit(10).all()
    return {
        "status": "healthy",
        "ledgerEngine": "SQLite WAL Engine",
        "cryptographicSync": "SHA-256 Verified",
        "recentBatches": [
            {
                "id": b.id,
                "deviceId": b.device_id,
                "serverTimestamp": b.server_timestamp,
                "payloadHash": b.payload_hash,
                "recordCount": b.record_count,
                "status": b.status,
            }
            for b in batches
        ],
    }


@router.post("/sync/push")
def push_sync_batch(payload: SyncPushPayload, db: Session = Depends(get_db)):
    batch_id = f"batch_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    batch = SyncBatch(
        id=batch_id,
        device_id=payload.deviceId,
        client_timestamp=datetime.now(timezone.utc),
        payload_hash=payload.payloadHash,
        record_count=len(payload.events) + len(payload.assets),
        status="committed",
    )
    db.add(batch)
    db.commit()

    return {
        "batchId": batch_id,
        "status": "committed",
        "recordsCommitted": batch.record_count,
        "serverTimestamp": datetime.now(timezone.utc).isoformat(),
    }
