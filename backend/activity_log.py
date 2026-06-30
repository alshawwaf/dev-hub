"""Lightweight activity logging.

A request-capture helper backed by a SINGLE bounded background writer. This
matters: the previous design spawned a fresh thread (and grabbed a fresh DB
connection) on every request, so under steady polling it starved the connection
pool and the sync threadpool — every request then timed out (504s on
everything). Here, exactly one writer thread drains a bounded queue, so logging
can never exhaust the pool and never blocks a response; under load, events are
dropped rather than queued without limit. Sensitive fields are redacted before
anything is persisted.
"""
import os
import queue
import threading
from jose import jwt, JWTError
from db.database import SessionLocal
from db import models

SECRET_KEY = os.getenv("SECRET_KEY", "dev_hub_secret_key_12345")
ALGORITHM = "HS256"
RETENTION = 5000      # keep at most this many rows; trim oldest beyond it
TRIM_EVERY = 200      # only check/trim occasionally (avoids a COUNT per write)
QUEUE_MAX = 1000      # drop events beyond this rather than block requests

SENSITIVE_SUBSTR = ("password", "token", "secret", "authorization", "cookie", "api_key", "apikey")
# High-frequency / noisy paths are not worth logging and would add write load:
# /notifications is polled on a timer, /activity is the feed polling itself.
EXCLUDED_PREFIXES = ("/activity", "/health", "/embed", "/notifications")

_queue: "queue.Queue" = queue.Queue(maxsize=QUEUE_MAX)
_worker_started = False
_worker_lock = threading.Lock()


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


def _trim(db):
    count = db.query(models.ActivityLog).count()
    if count > RETENTION:
        old = (db.query(models.ActivityLog.id)
               .order_by(models.ActivityLog.id.asc())
               .limit(count - RETENTION).all())
        ids = [r[0] for r in old]
        if ids:
            db.query(models.ActivityLog).filter(models.ActivityLog.id.in_(ids)).delete(synchronize_session=False)
            db.commit()


def _worker():
    writes = 0
    while True:
        fields = _queue.get()
        try:
            if fields is None:  # shutdown sentinel
                return
            db = SessionLocal()
            try:
                if fields.get("detail") is not None:
                    fields["detail"] = _redact(fields["detail"])
                db.add(models.ActivityLog(**fields))
                db.commit()
                writes += 1
                if writes % TRIM_EVERY == 0:
                    _trim(db)
            except Exception as e:
                print(f"activity log write failed: {e}")
                try:
                    db.rollback()
                except Exception:
                    pass
            finally:
                db.close()
        finally:
            _queue.task_done()


def _ensure_worker():
    global _worker_started
    if _worker_started:
        return
    with _worker_lock:
        if not _worker_started:
            threading.Thread(target=_worker, daemon=True, name="activity-writer").start()
            _worker_started = True


def write_activity(**fields):
    """Enqueue an activity event for the background writer. Best-effort: if the
    queue is full (sustained load) the event is dropped — logging must never
    block or slow a response, nor queue without bound."""
    _ensure_worker()
    try:
        _queue.put_nowait(fields)
    except queue.Full:
        pass
