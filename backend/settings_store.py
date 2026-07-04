"""Tiny encrypted key/value store for hub-level configuration (HubSetting rows).

Values go through crypto.encrypt/decrypt (AES-256-GCM) so credentials like the
Dokploy API token are never persisted in the clear. get_setting returns None for
a missing key OR an undecryptable value (e.g. SECRET_KEY rotated) — callers just
see "not configured", never a crash.
"""
from sqlalchemy.orm import Session
from db import models
import crypto


def get_setting(db: Session, key: str):
    row = db.query(models.HubSetting).filter(models.HubSetting.key == key).first()
    if row is None:
        return None
    return crypto.decrypt(row.value_enc)


def set_setting(db: Session, key: str, value):
    """Upsert a setting (encrypted at rest). value=None/"" stores an empty value,
    which get_setting reports as None — i.e. it clears the setting."""
    enc = crypto.encrypt(value)
    row = db.query(models.HubSetting).filter(models.HubSetting.key == key).first()
    if row is None:
        row = models.HubSetting(key=key, value_enc=enc)
        db.add(row)
    else:
        row.value_enc = enc
    db.commit()
