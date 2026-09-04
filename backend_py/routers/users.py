import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="", tags=["Users"])


def hydrate_user(user: models.MaintenanceUser, db: Session) -> schemas.MaintenanceUser:
    p_ids = user.property_ids or []
    props = db.query(models.Property).filter(models.Property.id.in_(p_ids)).all() if p_ids else []
    prop_list = [
        schemas.MaintenanceUserProperty(
            id=p.id,
            name=p.name,
            code=p.code,
        )
        for p in props
    ]

    return schemas.MaintenanceUser(
        id=user.id,
        user_id=user.user_id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        user_status=user.user_status,
        role=user.role,
        employment_type=user.employment_type,
        hourly_labor_rate=user.hourly_labor_rate,
        status=user.status,
        last_seen_at=user.last_seen_at,
        invited_at=user.invited_at,
        properties=prop_list,
    )


@router.get("/users", response_model=List[schemas.MaintenanceUser])
def list_users(db: Session = Depends(get_db)):
    users = db.query(models.MaintenanceUser).all()
    return [hydrate_user(u, db) for u in users]


@router.post("/users/invite", response_model=schemas.MaintenanceUser, status_code=201)
def invite_user(payload: schemas.InviteMaintenanceUserInput, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()

    # Check for duplicate email
    existing = db.query(models.MaintenanceUser).filter(models.MaintenanceUser.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with that email already exists.")

    ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    user_row = models.MaintenanceUser(
        id=f"mem_{ts}",
        user_id=f"user_{ts}",
        email=email_clean,
        full_name=payload.fullName.strip() if hasattr(payload, "fullName") and payload.fullName else payload.full_name.strip(),
        phone=payload.phone.strip() if payload.phone else None,
        user_status="invited",
        role=payload.role or "technician",
        employment_type=payload.employment_type or "employee",
        hourly_labor_rate=payload.hourly_labor_rate,
        status="invited",
        invited_at=datetime.datetime.now(datetime.timezone.utc),
    )
    user_row.property_ids = payload.property_ids or []

    db.add(user_row)
    db.commit()
    db.refresh(user_row)

    return hydrate_user(user_row, db)


@router.put("/users/{id}", response_model=schemas.MaintenanceUser)
@router.patch("/users/{id}", response_model=schemas.MaintenanceUser)
def update_user(
    id: str,
    payload: schemas.UpdateMaintenanceUserInput,
    db: Session = Depends(get_db),
):
    user = db.query(models.MaintenanceUser).filter(models.MaintenanceUser.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Maintenance user not found.")

    if payload.role is not None:
        user.role = payload.role
    if payload.employment_type is not None:
        user.employment_type = payload.employment_type
    if payload.hourly_labor_rate is not None:
        user.hourly_labor_rate = payload.hourly_labor_rate
    if payload.status is not None:
        user.status = payload.status
    if payload.property_ids is not None:
        user.property_ids = payload.property_ids

    db.commit()
    db.refresh(user)
    return hydrate_user(user, db)


@router.post("/users/{id}/toggle-status", response_model=schemas.MaintenanceUser)
def toggle_user_status(id: str, db: Session = Depends(get_db)):
    user = db.query(models.MaintenanceUser).filter(models.MaintenanceUser.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Maintenance user not found.")

    if user.status == "active":
        user.status = "revoked"
    else:
        user.status = "active"

    db.commit()
    db.refresh(user)
    return hydrate_user(user, db)
