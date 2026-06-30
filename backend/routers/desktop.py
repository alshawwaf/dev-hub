"""Per-user desktop layout persistence: each signed-in user's placement
overrides (which apps sit on the desktop vs dock) follow them across devices,
layered on top of the admin-set baseline (the Application.placement column).
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

VALID = {"desktop", "dock", "both", "hidden"}


class PrefsIn(BaseModel):
    overrides: Optional[dict] = None
    geometry: Optional[dict] = None   # None = leave unchanged


def _clean_overrides(raw: Optional[dict]) -> dict:
    clean = {}
    for k, v in (raw or {}).items():
        try:
            kid = int(k)
        except (TypeError, ValueError):
            continue
        if isinstance(v, str) and v in VALID:
            clean[str(kid)] = v
    return clean


def _clamp(v, lo, hi, default):
    try:
        return max(lo, min(hi, int(v)))
    except (TypeError, ValueError):
        return default


def _clean_geometry(raw: Optional[dict]) -> dict:
    clean = {}
    for k, v in (raw or {}).items():
        try:
            kid = int(k)
        except (TypeError, ValueError):
            continue
        if not isinstance(v, dict):
            continue
        clean[str(kid)] = {
            "x": _clamp(v.get("x"), 0, 8000, 0),
            "y": _clamp(v.get("y"), 28, 8000, 28),
            "w": _clamp(v.get("w"), 360, 8000, 880),
            "h": _clamp(v.get("h"), 240, 8000, 560),
        }
        if len(clean) >= 64:
            break
    return clean


@router.get("/prefs")
def get_prefs(db: Session = Depends(get_db), user: schemas.User = Depends(read_users_me)):
    row = db.query(models.UserDesktopPref).filter(models.UserDesktopPref.owner_id == user.id).first()
    return {
        "overrides": (row.overrides if row and row.overrides else {}),
        "geometry": (row.geometry if row and row.geometry else {}),
    }


@router.put("/prefs")
def put_prefs(body: PrefsIn, db: Session = Depends(get_db), user: schemas.User = Depends(read_users_me)):
    row = db.query(models.UserDesktopPref).filter(models.UserDesktopPref.owner_id == user.id).first()
    if not row:
        row = models.UserDesktopPref(owner_id=user.id, overrides={}, geometry={})
        db.add(row)
    if body.overrides is not None:
        row.overrides = _clean_overrides(body.overrides)
    if body.geometry is not None:
        row.geometry = _clean_geometry(body.geometry)
    db.commit()
    return {"overrides": row.overrides or {}, "geometry": row.geometry or {}}
