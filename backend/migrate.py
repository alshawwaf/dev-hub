"""Database initialization + lightweight, idempotent column migrations.

Called from BOTH seed.py (which runs standalone before uvicorn) and main.py
(uvicorn startup), so columns added after the first deploy exist before any
query touches them. Works on SQLite and Postgres and never raises — a failure
here must not stop the app from serving.
"""
from sqlalchemy import text, inspect
from db.database import engine, Base
from db import models  # noqa: F401 — register models on Base.metadata


def _add_missing_columns():
    inspector = inspect(engine)
    if not inspector.has_table("applications"):
        return
    existing = {col["name"] for col in inspector.get_columns("applications")}
    bool_false = "0" if engine.dialect.name == "sqlite" else "FALSE"
    pending = []
    if "embeddable" not in existing:
        pending.append(f"ALTER TABLE applications ADD COLUMN embeddable BOOLEAN DEFAULT {bool_false}")
    if "placement" not in existing:
        pending.append("ALTER TABLE applications ADD COLUMN placement VARCHAR DEFAULT 'desktop'")
    if "proxy_embed" not in existing:
        pending.append(f"ALTER TABLE applications ADD COLUMN proxy_embed BOOLEAN DEFAULT {bool_false}")
    for stmt in pending:
        try:
            with engine.begin() as conn:
                conn.execute(text(stmt))
            print(f"Migration applied: {stmt}")
        except Exception as e:
            print(f"Migration skipped ({stmt}): {e}")


def init_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"create_all failed (continuing): {e}")
    try:
        _add_missing_columns()
    except Exception as e:
        print(f"Migration check failed (continuing): {e}")
