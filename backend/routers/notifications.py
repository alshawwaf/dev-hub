"""Notification center: a small global feed (e.g. an app was added/edited),
surfaced via the menu-bar bell. Read state is shared (this is a single-admin
hub); scoped to signed-in users.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from db import models
from db.database import get_db
import schemas
from .auth import read_users_me

router = APIRouter()

MAX_KEEP = 50


def emit(db: Session, text: str, kind: str = "info"):
    """Record a notification + trim the table. Best-effort; never raises."""
    try:
        db.add(models.Notification(text=text, kind=kind))
        db.commit()
        count = db.query(models.Notification).count()
        if count > MAX_KEEP:
            old = (db.query(models.Notification.id)
                   .order_by(models.Notification.id.asc()).limit(count - MAX_KEEP).all())
            ids = [r[0] for r in old]
            if ids:
                db.query(models.Notification).filter(models.Notification.id.in_(ids)).delete(synchronize_session=False)
                db.commit()
    except Exception as e:
        print(f"notification emit failed: {e}")


def _row(n: models.Notification) -> dict:
    return {"id": n.id, "kind": n.kind, "text": n.text, "read": n.read,
            "created_at": n.created_at.isoformat() if n.created_at else None}


@router.get("/")
def list_notifications(db: Session = Depends(get_db), user: schemas.User = Depends(read_users_me)):
    rows = db.query(models.Notification).order_by(models.Notification.id.desc()).limit(MAX_KEEP).all()
    unread = db.query(models.Notification).filter(models.Notification.read == False).count()  # noqa: E712
    return {"items": [_row(n) for n in rows], "unread": unread}


class ReadIn(BaseModel):
    id: Optional[int] = None


@router.post("/read")
def mark_read(body: ReadIn, db: Session = Depends(get_db), user: schemas.User = Depends(read_users_me)):
    q = db.query(models.Notification)
    if body.id is not None:
        q = q.filter(models.Notification.id == body.id)
    q.update({models.Notification.read: True}, synchronize_session=False)
    db.commit()
    return {"ok": True}


@router.delete("/")
def clear(db: Session = Depends(get_db), user: schemas.User = Depends(read_users_me)):
    deleted = db.query(models.Notification).delete()
    db.commit()
    return {"deleted": deleted}


@router.delete("/{nid}")
def delete_one(nid: int, db: Session = Depends(get_db), user: schemas.User = Depends(read_users_me)):
    db.query(models.Notification).filter(models.Notification.id == nid).delete()
    db.commit()
    return {"ok": True}
