from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, inspect
from db.database import engine, Base
from routers import auth, apps
from seed import seed

# Create database tables
Base.metadata.create_all(bind=engine)

# Lightweight, idempotent migrations for columns added after the first deploy.
# create_all() never ALTERs existing tables. Must work on SQLite (no
# "ADD COLUMN IF NOT EXISTS") and Postgres, and must never crash startup —
# so we inspect existing columns first and add only what's missing, each in
# its own transaction.
def _run_migrations():
    try:
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
        for stmt in pending:
            try:
                with engine.begin() as conn:
                    conn.execute(text(stmt))
                print(f"Migration applied: {stmt}")
            except Exception as e:
                print(f"Migration skipped ({stmt}): {e}")
    except Exception as e:
        print(f"Migration check failed (continuing): {e}")

_run_migrations()

# Auto-seed on startup
try:
    seed()
except Exception as e:
    print(f"Seeding error (may be normal on first run): {e}")

app = FastAPI(title="Dev-Hub API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(apps.router, prefix="/apps", tags=["apps"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Dev-Hub API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
