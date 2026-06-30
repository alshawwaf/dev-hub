"""Per-user desktop layout persistence: each signed-in user's placement
overrides (which apps sit on the desktop vs dock) follow them across devices,
layered on top of the admin-set baseline (the Application.placement column).
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from db import models
from db.database import get_db
import schemas
from .auth import read_users_me

router = APIRouter()

VALID = {"desktop", "dock", "both", "hidden"}
# Widget ids the desktop rail knows how to render (see frontend os/widgets/registry).
VALID_WIDGETS = {"clock", "apps", "activity", "errors", "latency", "recent", "notifications", "lastapp", "quick"}


class PrefsIn(BaseModel):
    overrides: Optional[dict] = None
    geometry: Optional[dict] = None   # None = leave unchanged
    widgets: Optional[list] = None    # None = leave unchanged; [] = explicitly none


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


def _clean_widgets(raw) -> list:
    if not isinstance(raw, list):
        return []
    out = []
    for v in raw:
        if isinstance(v, str) and v in VALID_WIDGETS and v not in out:
            out.append(v)
        if len(out) >= 12:
            break
    return out


@router.get("/prefs")
def get_prefs(db: Session = Depends(get_db), user: schemas.User = Depends(read_users_me)):
    row = db.query(models.UserDesktopPref).filter(models.UserDesktopPref.owner_id == user.id).first()
    return {
        "overrides": (row.overrides if row and row.overrides else {}),
        "geometry": (row.geometry if row and row.geometry else {}),
        # None (never set) -> client applies its default; [] -> user disabled all.
        "widgets": (row.widgets if row and row.widgets is not None else None),
    }


@router.put("/prefs")
def put_prefs(body: PrefsIn, db: Session = Depends(get_db), user: schemas.User = Depends(read_users_me)):
    row = db.query(models.UserDesktopPref).filter(models.UserDesktopPref.owner_id == user.id).first()
    if not row:
        row = models.UserDesktopPref(owner_id=user.id, overrides={}, geometry={}, widgets=[])
        db.add(row)
    if body.overrides is not None:
        row.overrides = _clean_overrides(body.overrides)
    if body.geometry is not None:
        row.geometry = _clean_geometry(body.geometry)
    if body.widgets is not None:
        row.widgets = _clean_widgets(body.widgets)
    db.commit()
    return {"overrides": row.overrides or {}, "geometry": row.geometry or {}, "widgets": row.widgets or []}


@router.get("/widgets")
def widgets_data(db: Session = Depends(get_db), user: schemas.User = Depends(read_users_me)):
    """Live data for the desktop widget rail (re-domained from PolicyPilot's
    policy metrics to dev-hub: apps, activity pulse, errors, latency, recent,
    notifications, last-added app). Auth-gated for any signed-in user."""
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    win_start = now - timedelta(minutes=20)
    one_min_ago = now - timedelta(minutes=1)

    A, L, N = models.Application, models.ActivityLog, models.Notification

    apps_total = db.query(func.count(A.id)).scalar() or 0
    apps_live = db.query(func.count(A.id)).filter(A.is_live == True).scalar() or 0      # noqa: E712
    apps_embed = db.query(func.count(A.id)).filter(A.embeddable == True).scalar() or 0  # noqa: E712

    spark = [0] * 20
    rate = 0
    for (at,) in db.query(L.at).filter(L.at >= win_start).all():
        if at is None:
            continue
        a = at if at.tzinfo else at.replace(tzinfo=timezone.utc)
        idx = int((a - win_start).total_seconds() // 60)
        if 0 <= idx < 20:
            spark[idx] += 1
        if a >= one_min_ago:
            rate += 1

    err_total = db.query(func.count(L.id)).filter(L.at >= today).scalar() or 0
    err_count = db.query(func.count(L.id)).filter(L.at >= today, L.status >= 400).scalar() or 0
    err_pct = round(100 * err_count / err_total, 1) if err_total else 0.0
    avg = db.query(func.avg(L.duration_ms)).filter(L.at >= today).scalar()

    recent = [
        {"method": r.method, "path": r.path, "status": r.status, "kind": r.kind,
         "at": r.at.isoformat() if r.at else None}
        for r in db.query(L).order_by(L.id.desc()).limit(6).all()
    ]

    unread = db.query(func.count(N.id)).filter(N.read == False).scalar() or 0  # noqa: E712
    ln = db.query(N).order_by(N.id.desc()).first()
    latest = ({"text": ln.text, "kind": ln.kind,
               "created_at": ln.created_at.isoformat() if ln.created_at else None} if ln else None)

    la = db.query(A).order_by(A.id.desc()).first()
    last_app = ({"name": la.name, "category": la.category, "is_live": la.is_live} if la else None)

    return {
        "apps": {"total": apps_total, "live": apps_live, "embeddable": apps_embed},
        "activity": {"rate": rate, "spark": spark},
        "errors": {"total": err_total, "err": err_count, "pct": err_pct},
        "latency": {"avg": int(avg) if avg is not None else 0},
        "recent": recent,
        "notifications": {"unread": unread, "latest": latest},
        "last_app": last_app,
    }
