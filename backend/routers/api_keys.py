"""API key management. Keys are bearer credentials ("devhub_…") for scripts and
agents (n8n, the MCP endpoint). Only a SHA-256 hash is stored; the raw key is
shown exactly once at creation. Scopes: read (GET-only), write (mutations),
admin (admin endpoints) — enforced centrally in auth.read_users_me /
get_current_admin_user.
"""
import hashlib
import secrets
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from db import models
from db.database import get_db
import schemas
from .auth import read_users_me, effective_admin, _utcnow
from .notifications import emit

router = APIRouter()

VALID_SCOPES = {"read", "write", "admin"}
PREFIX_LEN = 12  # first 12 chars of the raw key, safe to display


def _row(k: models.ApiKey, owner_email: str = None) -> dict:
    out = {
        "id": k.id, "name": k.name, "prefix": k.prefix, "scopes": list(k.scopes or []),
        "created_at": k.created_at.isoformat() if k.created_at else None,
        "expires_at": k.expires_at.isoformat() if k.expires_at else None,
        "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
        "revoked": bool(k.revoked),
    }
    if owner_email is not None:
        out["owner_email"] = owner_email
    return out


@router.get("/")
def list_keys(request: Request, all: int = 0, db: Session = Depends(get_db),
              user: schemas.User = Depends(read_users_me)):
    """The caller's keys (hashes never leave the server). An admin may pass
    ?all=1 to see every key with its owner's email."""
    if all and effective_admin(request, user):
        rows = (db.query(models.ApiKey, models.User.email)
                .outerjoin(models.User, models.User.id == models.ApiKey.owner_id)
                .order_by(models.ApiKey.id.desc()).all())
        return [_row(k, owner_email=email or "?") for k, email in rows]
    rows = (db.query(models.ApiKey).filter(models.ApiKey.owner_id == user.id)
            .order_by(models.ApiKey.id.desc()).all())
    return [_row(k) for k in rows]


@router.post("/")
def create_key(body: schemas.ApiKeyCreate, request: Request, db: Session = Depends(get_db),
               user: schemas.User = Depends(read_users_me)):
    """Mint a new key. The raw value is in the response ONCE — it cannot be
    recovered later. The admin scope needs admin authority (an admin user on a
    JWT session or an admin-scoped key — a write-only key must not mint an
    admin key for its owner)."""
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="A key name is required")
    scopes = sorted(set(body.scopes or []))
    if not scopes or not set(scopes) <= VALID_SCOPES:
        raise HTTPException(status_code=400,
                            detail=f"Scopes must be a non-empty subset of {sorted(VALID_SCOPES)}")
    if "admin" in scopes and not effective_admin(request, user):
        raise HTTPException(status_code=403, detail="Only an administrator can create an admin-scope key")
    expires_at = None
    if body.expires_days is not None:
        if body.expires_days < 1:
            raise HTTPException(status_code=400, detail="expires_days must be at least 1")
        expires_at = _utcnow() + timedelta(days=body.expires_days)

    raw = "devhub_" + secrets.token_urlsafe(32)
    row = models.ApiKey(
        owner_id=user.id, name=name, prefix=raw[:PREFIX_LEN],
        key_hash=hashlib.sha256(raw.encode("utf-8")).hexdigest(),
        scopes=scopes, expires_at=expires_at, revoked=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    emit(db, f"API key “{name}” ({', '.join(scopes)}) created by {user.email}", "info")
    return {"key": raw, **_row(row)}


@router.delete("/{key_id}")
def revoke_key(key_id: int, request: Request, db: Session = Depends(get_db),
               user: schemas.User = Depends(read_users_me)):
    """Revoke a key (owner or admin). Revocation, not deletion — the row stays
    for the audit trail and the prefix stays displayable."""
    row = db.query(models.ApiKey).filter(models.ApiKey.id == key_id).first()
    # A key that isn't yours (and you're not admin) reads the same as one that
    # doesn't exist, so a non-owner can't enumerate other users' key ids.
    if row is None or (row.owner_id != user.id and not effective_admin(request, user)):
        raise HTTPException(status_code=404, detail="API key not found")
    if not row.revoked:
        row.revoked = True
        db.commit()
        emit(db, f"API key “{row.name}” revoked by {user.email}", "warning")
    return {"ok": True}
