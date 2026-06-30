from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from db.database import engine, Base
from routers import auth, apps
from seed import seed

# Create database tables
Base.metadata.create_all(bind=engine)

# Lightweight, idempotent migrations for columns added after the first deploy.
# create_all() never ALTERs existing tables, so new columns must be added here.
def _run_migrations():
    statements = [
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS embeddable BOOLEAN DEFAULT FALSE",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS placement VARCHAR DEFAULT 'desktop'",
    ]
    with engine.begin() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print(f"Migration skipped ({stmt}): {e}")

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
