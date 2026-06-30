from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from db import models
from db.database import get_db
import schemas
from .auth import get_current_admin_user

router = APIRouter()


def _row(r: models.ActivityLog) -> dict:
    return {
        "id": r.id,
        "at": r.at.isoformat() if r.at else None,
        "kind": r.kind,
        "method": r.method,
        "path": r.path,
        "source_ip": r.source_ip,
        "actor": r.actor,
        "status": r.status,
        "duration_ms": r.duration_ms,
        "summary": r.summary,
    }


@router.get("/")
def list_activity(
    db: Session = Depends(get_db),
    admin: schemas.User = Depends(get_current_admin_user),
    kind: str | None = None,
    only: str | None = None,   # "errors" -> status >= 400
    q: str | None = None,
    page: int = 1,
    page_size: int = 50,
):
    base = db.query(models.ActivityLog)
    if kind:
        base = base.filter(models.ActivityLog.kind == kind)
    if only == "errors":
        base = base.filter(models.ActivityLog.status >= 400)
    if q:
        like = f"%{q}%"
        base = base.filter(or_(
            models.ActivityLog.path.ilike(like),
            models.ActivityLog.summary.ilike(like),
            models.ActivityLog.source_ip.ilike(like),
            models.ActivityLog.actor.ilike(like),
        ))

    total = base.count()
    errors = base.filter(models.ActivityLog.status >= 400).count()
    avg_ms = db.query(func.avg(models.ActivityLog.duration_ms)).scalar()
    sources = db.query(func.count(func.distinct(models.ActivityLog.source_ip))).scalar()

    page = max(1, page)
    page_size = min(max(1, page_size), 200)
    rows = (base.order_by(models.ActivityLog.id.desc())
            .offset((page - 1) * page_size).limit(page_size).all())

    return {
        "items": [_row(r) for r in rows],
        "total": total,
        "errors": errors,
        "avg_ms": round(avg_ms) if avg_ms is not None else 0,
        "sources": sources or 0,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{log_id}")
def get_activity(log_id: int, db: Session = Depends(get_db), admin: schemas.User = Depends(get_current_admin_user)):
    r = db.query(models.ActivityLog).filter(models.ActivityLog.id == log_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    return {**_row(r), "detail": r.detail}


@router.delete("/")
def clear_activity(db: Session = Depends(get_db), admin: schemas.User = Depends(get_current_admin_user)):
    deleted = db.query(models.ActivityLog).delete()
    db.commit()
    return {"deleted": deleted}
