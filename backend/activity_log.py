"""Lightweight activity logging: a request-capture helper + a fire-and-forget
writer so logging never blocks or breaks a response. Sensitive fields are
redacted before anything is persisted.
"""
import os
import threading
from jose import jwt, JWTError
from db.database import SessionLocal
from db import models

SECRET_KEY = os.getenv("SECRET_KEY", "dev_hub_secret_key_12345")
ALGORITHM = "HS256"
RETENTION = 5000  # keep at most this many rows; trim oldest beyond it

SENSITIVE_SUBSTR = ("password", "token", "secret", "authorization", "cookie", "api_key", "apikey")
EXCLUDED_PREFIXES = ("/activity", "/health", "/embed")


def _redact(obj):
    if isinstance(obj, dict):
        return {k: ("***" if any(s in k.lower() for s in SENSITIVE_SUBSTR) else _redact(v)) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_redact(v) for v in obj]
    return obj


def excluded(path: str) -> bool:
    return path == "/" or any(path.startswith(p) for p in EXCLUDED_PREFIXES)


def classify(method: str, path: str) -> str:
    if path.startswith("/auth"):
        return "auth"
    if path.startswith("/apps") and method in ("POST", "PUT", "DELETE", "PATCH"):
        return "admin"
    if path.startswith("/embed"):
        return "embed"
    return "api"


def actor_from_auth(authorization):
    if not authorization or not authorization.lower().startswith("bearer "):
        return "anon"
    try:
        payload = jwt.decode(authorization.split(" ", 1)[1], SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub") or "anon"
    except JWTError:
        return "anon"


def write_activity(**fields):
    def _job():
        db = SessionLocal()
        try:
            if fields.get("detail") is not None:
                fields["detail"] = _redact(fields["detail"])
            db.add(models.ActivityLog(**fields))
            db.commit()
            count = db.query(models.ActivityLog).count()
            if count > RETENTION:
                old = (db.query(models.ActivityLog.id)
                       .order_by(models.ActivityLog.id.asc())
                       .limit(count - RETENTION).all())
                ids = [r[0] for r in old]
                if ids:
                    db.query(models.ActivityLog).filter(models.ActivityLog.id.in_(ids)).delete(synchronize_session=False)
                    db.commit()
        except Exception as e:
            print(f"activity log write failed: {e}")
        finally:
            db.close()

    threading.Thread(target=_job, daemon=True).start()
