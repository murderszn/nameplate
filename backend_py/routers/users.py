import json
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import MaintenanceUser, Property
from ..schemas import MaintenanceUserSchema, InviteUserInput, UpdateUserInput

router = APIRouter(tags=["users"])


def format_user_response(user: MaintenanceUser, db: Session) -> dict:
    prop_ids = user.property_ids
    props = db.query(Property).filter(Property.id.in_(prop_ids)).all() if prop_ids else []
    return {
        "id": user.id,
        "userId": user.user_id,
        "email": user.email,
        "fullName": user.full_name,
        "phone": user.phone,
        "userStatus": user.user_status,
        "role": user.role,
        "employmentType": user.employment_type,
        "hourlyLaborRate": user.hourly_labor_rate,
        "status": user.status,
        "lastSeenAt": user.last_seen_at,
        "invitedAt": user.invited_at,
        "properties": [{"id": p.id, "name": p.name, "code": p.code} for p in props],
    }


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    users = db.query(MaintenanceUser).all()
    return [format_user_response(u, db) for u in users]


@router.post("/users/invite")
def invite_user(payload: InviteUserInput, db: Session = Depends(get_db)):
    existing = db.query(MaintenanceUser).filter(MaintenanceUser.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    user_id = f"usr_{int(datetime.now(timezone.utc).timestamp())}"
    rec_id = f"user_{payload.fullName.lower().replace(' ', '_')}"

    new_user = MaintenanceUser(
        id=rec_id,
        user_id=user_id,
        email=payload.email,
        full_name=payload.fullName,
        phone=payload.phone,
        role=payload.role,
        employment_type=payload.employmentType,
        hourly_labor_rate=payload.hourlyLaborRate or 58.0,
        status="invited",
        property_ids_json=json.dumps(payload.propertyIds or []),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return format_user_response(new_user, db)


@router.put("/users/{user_id}")
def update_user(user_id: str, payload: UpdateUserInput, db: Session = Depends(get_db)):
    user = db.query(MaintenanceUser).filter(MaintenanceUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Maintenance user not found")

    if payload.role is not None:
        user.role = payload.role
    if payload.employmentType is not None:
        user.employment_type = payload.employmentType
    if payload.hourlyLaborRate is not None:
        user.hourly_labor_rate = payload.hourlyLaborRate
    if payload.status is not None:
        user.status = payload.status
    if payload.propertyIds is not None:
        user.property_ids = payload.propertyIds

    db.commit()
    db.refresh(user)
    return format_user_response(user, db)


@router.post("/users/{user_id}/toggle-status")
def toggle_user_status(user_id: str, db: Session = Depends(get_db)):
    user = db.query(MaintenanceUser).filter(MaintenanceUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Maintenance user not found")

    user.status = "revoked" if user.status == "active" else "active"
    db.commit()
    db.refresh(user)
    return format_user_response(user, db)
