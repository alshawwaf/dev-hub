"""Per-user desktop layout persistence: each signed-in user's placement
overrides (which apps sit on the desktop vs dock) follow them across devices,
layered on top of the admin-set baseline (the Application.placement column).
"""
import os
import re
import time
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from db import models
from db.database import get_db
import schemas
from .auth import read_users_me, get_current_admin_user

router = APIRouter()

# Backend start (for the System widget's uptime).
_STARTED = time.monotonic()

VALID = {"desktop", "dock", "both", "hidden"}
# Widget ids the desktop rail knows how to render (see frontend os/widgets/registry).
VALID_WIDGETS = {"clock", "apps", "activity", "errors", "latency", "recent", "notifications", "lastapp", "quick", "system"}
# Icon/folder color values accepted from the client: a macOS-tag palette key or a raw hex.
FOLDER_COLOR_KEYS = {"blue", "purple", "pink", "red", "orange", "green", "graphite"}
_HEX_COLOR_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


def _system_stats() -> dict:
    """Host/app utilization via stdlib only (no psutil): app uptime, load average,
    memory (from /proc/meminfo on Linux), and disk usage of /. Each piece degrades
    to None if unavailable so the widget stays resilient across platforms."""
    stats: dict = {"uptime_seconds": int(time.monotonic() - _STARTED), "cpus": os.cpu_count() or 1}
    try:
        stats["load"] = [round(x, 2) for x in os.getloadavg()]
    except (OSError, AttributeError):
        stats["load"] = None
    try:
        mem = {}
        with open("/proc/meminfo") as f:
            for line in f:
                key, _, rest = line.partition(":")
                mem[key] = int(rest.strip().split()[0])  # kB
        total = mem.get("MemTotal", 0)
        avail = mem.get("MemAvailable", mem.get("MemFree", 0))
        stats["mem"] = {"used_pct": round(100 * (total - avail) / total, 1) if total else None,
                        "total_mb": round(total / 1024)}
    except Exception:
        stats["mem"] = None
    try:
        st = os.statvfs("/")
        total = st.f_blocks * st.f_frsize
        free = st.f_bavail * st.f_frsize
        stats["disk"] = {"used_pct": round(100 * (total - free) / total, 1) if total else None,
                         "total_gb": round(total / 1e9, 1)}
    except Exception:
        stats["disk"] = None
    return stats


class PrefsIn(BaseModel):
    overrides: Optional[dict] = None
    geometry: Optional[dict] = None   # None = leave unchanged
    widgets: Optional[list] = None    # None = leave unchanged; [] = explicitly none
    theme: Optional[str] = None       # "dark" | "light"; None = leave unchanged
    icon_positions: Optional[dict] = None  # { appId: {x,y} }; None = leave unchanged
    folders: Optional[list] = None    # [{id, name, app_ids}]; None = leave unchanged; [] = no folders
    icon_colors: Optional[dict] = None  # { appId: "blue"|"#rrggbb" }; None = leave unchanged; {} = clear all


class DefaultIn(BaseModel):
    placements: dict   # { appId: "desktop|dock|both|hidden" } — admin writes the shared baseline


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
    # OverflowError guards against JSON Infinity/-Infinity (stdlib json.loads accepts
    # them): int(float('inf')) raises OverflowError, which would otherwise 500 the PUT.
    try:
        return max(lo, min(hi, int(v)))
    except (TypeError, ValueError, OverflowError):
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
            "max": bool(v.get("max")),   # remembered maximized state
        }
        if len(clean) >= 64:
            break
    return clean


def _clean_icon_positions(raw) -> dict:
    clean = {}
    for k, v in (raw or {}).items():
        try:
            kid = int(k)
        except (TypeError, ValueError):
            continue
        if not isinstance(v, dict):
            continue
        clean[str(kid)] = {"x": _clamp(v.get("x"), 0, 12000, 0), "y": _clamp(v.get("y"), 0, 12000, 0)}
        if len(clean) >= 128:
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


def _clean_folders(raw) -> list:
    """Desktop folders: [{id, name, app_ids}]. Folder ids are negative (client
    allocates from -1001 down); names capped at 60 chars; an app can live in at
    most one folder (first wins). Caps keep a hostile payload small."""
    if not isinstance(raw, list):
        return []
    out, seen_ids, seen_apps = [], set(), set()
    for f in raw:
        if not isinstance(f, dict):
            continue
        try:
            fid = int(f.get("id"))
        except (TypeError, ValueError, OverflowError):   # OverflowError: JSON Infinity id
            continue
        if fid >= 0 or fid in seen_ids:
            continue
        name = f.get("name")
        name = name.strip()[:60] if isinstance(name, str) and name.strip() else "Folder"
        app_ids = []
        raw_ids = f.get("app_ids")
        if isinstance(raw_ids, list):
            for v in raw_ids:
                try:
                    aid = int(v)
                except (TypeError, ValueError, OverflowError):   # OverflowError: JSON Infinity app id
                    continue
                if aid > 0 and aid not in seen_apps:
                    seen_apps.add(aid)
                    app_ids.append(aid)
                if len(app_ids) >= 128:
                    break
        color = f.get("color")
        color = color if _is_valid_color(color) else None
        seen_ids.add(fid)
        out.append({"id": fid, "name": name, "app_ids": app_ids, "color": color})
        if len(out) >= 64:
            break
    return out


def _is_valid_color(v) -> bool:
    # fullmatch (not match): match + "$" would accept a trailing newline (#3b82f6\n).
    return isinstance(v, str) and (v in FOLDER_COLOR_KEYS or bool(_HEX_COLOR_RE.fullmatch(v)))


def _clean_icon_colors(raw) -> dict:
    """Per-app icon tints: { appId: "blue" | "#3b82f6" }. Values must be a known
    palette key or a valid hex; ids must be ints. Caps keep a hostile payload small."""
    clean = {}
    for k, v in (raw or {}).items():
        try:
            kid = int(k)
        except (TypeError, ValueError):
            continue
        if _is_valid_color(v):
            clean[str(kid)] = v
        if len(clean) >= 256:
            break
    return clean


@router.get("/prefs")
def get_prefs(db: Session = Depends(get_db), user: schemas.User = Depends(read_users_me)):
    row = db.query(models.UserDesktopPref).filter(models.UserDesktopPref.owner_id == user.id).first()
    return {
        "overrides": (row.overrides if row and row.overrides else {}),
        "geometry": (row.geometry if row and row.geometry else {}),
        # None (never set) -> client applies its default; [] -> user disabled all.
        "widgets": (row.widgets if row and row.widgets is not None else None),
        "theme": (row.theme if row and row.theme else "dark"),
        "icon_positions": (row.icon_positions if row and row.icon_positions else {}),
        "folders": (row.folders if row and row.folders else []),
        "icon_colors": (row.icon_colors if row and row.icon_colors else {}),
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
    if body.theme in ("dark", "light", "auto"):
        row.theme = body.theme
    if body.icon_positions is not None:
        row.icon_positions = _clean_icon_positions(body.icon_positions)
    if body.folders is not None:
        row.folders = _clean_folders(body.folders)
    if body.icon_colors is not None:
        row.icon_colors = _clean_icon_colors(body.icon_colors)
    db.commit()
    return {"overrides": row.overrides or {}, "geometry": row.geometry or {}, "widgets": row.widgets or [],
            "theme": row.theme or "dark", "icon_positions": row.icon_positions or {},
            "folders": row.folders or [], "icon_colors": row.icon_colors or {}}


@router.post("/default")
def set_default(body: DefaultIn, db: Session = Depends(get_db), admin: schemas.User = Depends(get_current_admin_user)):
    """Admin-only: snapshot the submitted per-app placements as the shared baseline
    (Application.placement) — the default layout for everyone."""
    updated = 0
    for k, v in (body.placements or {}).items():
        if not isinstance(v, str) or v not in VALID:
            continue
        try:
            aid = int(k)
        except (TypeError, ValueError):
            continue
        app = db.query(models.Application).filter(models.Application.id == aid).first()
        if app:
            app.placement = v
            updated += 1
    db.commit()
    return {"updated": updated}


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
        "system": _system_stats(),
    }
