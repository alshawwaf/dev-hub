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
    if "embed_url" not in existing:
        pending.append("ALTER TABLE applications ADD COLUMN embed_url VARCHAR")
    # Dokploy service mapping (lifecycle: status / start / stop / restart / redeploy)
    if "deploy_kind" not in existing:
        pending.append("ALTER TABLE applications ADD COLUMN deploy_kind VARCHAR")
    if "deploy_id" not in existing:
        pending.append("ALTER TABLE applications ADD COLUMN deploy_id VARCHAR")
    # remembered window geometry, added after the prefs table first shipped
    if inspector.has_table("user_desktop_prefs"):
        upcols = {col["name"] for col in inspector.get_columns("user_desktop_prefs")}
        if "geometry" not in upcols:
            pending.append("ALTER TABLE user_desktop_prefs ADD COLUMN geometry JSON")
        if "widgets" not in upcols:
            pending.append("ALTER TABLE user_desktop_prefs ADD COLUMN widgets JSON")
        if "theme" not in upcols:
            pending.append("ALTER TABLE user_desktop_prefs ADD COLUMN theme VARCHAR DEFAULT 'dark'")
        if "icon_positions" not in upcols:
            pending.append("ALTER TABLE user_desktop_prefs ADD COLUMN icon_positions JSON")
        if "folders" not in upcols:
            pending.append("ALTER TABLE user_desktop_prefs ADD COLUMN folders JSON")
        if "icon_colors" not in upcols:
            pending.append("ALTER TABLE user_desktop_prefs ADD COLUMN icon_colors JSON")

    is_pg = engine.dialect.name != "sqlite"
    for stmt in pending:
        try:
            with engine.begin() as conn:
                # DDL needs room: the engine's runtime caps (statement_timeout=8s,
                # lock_timeout=4s) would otherwise abort an ALTER that briefly waits
                # for ACCESS EXCLUSIVE during a busy redeploy, silently leaving a
                # column missing -> the /apps/ SELECT then 500s. Relax for this
                # transaction only (SET LOCAL auto-resets on commit); request
                # handlers keep the runtime caps.
                if is_pg:
                    conn.execute(text("SET LOCAL statement_timeout = 0"))
                    conn.execute(text("SET LOCAL lock_timeout = '60s'"))
                conn.execute(text(stmt))
            print(f"Migration applied: {stmt}")
        except Exception as e:
            print(f"ERROR: migration failed, schema may be incomplete ({stmt}): {e}")


def init_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"create_all failed (continuing): {e}")
    try:
        _add_missing_columns()
    except Exception as e:
        print(f"Migration check failed (continuing): {e}")
