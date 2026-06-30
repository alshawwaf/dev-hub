"""Per-user desktop layout persistence: each signed-in user's placement
overrides (which apps sit on the desktop vs dock) follow them across devices,
layered on top of the admin-set baseline (the Application.placement column).
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import models
from db.database import get_db
import schemas
from .auth import read_users_me

router = APIRouter()

VALID = {"desktop", "dock", "both", "hidden"}


class PrefsIn(BaseModel):
    overrides: dict


@router.get("/prefs")
def get_prefs(db: Session = Depends(get_db), user: schemas.User = Depends(read_users_me)):
    row = db.query(models.UserDesktopPref).filter(models.UserDesktopPref.owner_id == user.id).first()
    return {"overrides": (row.overrides if row and row.overrides else {})}


@router.put("/prefs")
def put_prefs(body: PrefsIn, db: Session = Depends(get_db), user: schemas.User = Depends(read_users_me)):
    # keep only well-formed { intId: validPlacement } pairs
    clean = {}
    for k, v in (body.overrides or {}).items():
        try:
            kid = int(k)
        except (TypeError, ValueError):
            continue
        if isinstance(v, str) and v in VALID:
            clean[str(kid)] = v

    row = db.query(models.UserDesktopPref).filter(models.UserDesktopPref.owner_id == user.id).first()
    if row:
        row.overrides = clean
    else:
        db.add(models.UserDesktopPref(owner_id=user.id, overrides=clean))
    db.commit()
    return {"overrides": clean}
