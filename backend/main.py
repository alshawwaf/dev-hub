import time
from urllib.parse import parse_qsl, urlencode
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from migrate import init_db
from routers import auth, apps, embed, activity, desktop, notifications
from activity_log import write_activity, actor_from_auth, classify, excluded, SENSITIVE_SUBSTR
from seed import seed

# Create tables + apply column migrations before anything queries the DB.
init_db()

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

def _redact_qs(raw: str):
    """Mask sensitive query-param VALUES. The dict-based _redact only masks keys,
    so a secret carried as ?token=…/?api_key=… would otherwise be logged verbatim."""
    if not raw:
        return None
    pairs = parse_qsl(raw, keep_blank_values=True)
    masked = [(k, "***" if any(s in k.lower() for s in SENSITIVE_SUBSTR) else v) for k, v in pairs]
    return urlencode(masked) or None


# Activity logging — capture each request (added after CORS so it wraps it).
# Logging faults must never break a response, so everything is guarded.
@app.middleware("http")
async def activity_logger(request: Request, call_next):
    if excluded(request.url.path):
        return await call_next(request)
    start = time.monotonic()
    response = await call_next(request)
    try:
        fwd = request.headers.get("x-forwarded-for", "")
        ip = fwd.split(",")[0].strip() or (request.client.host if request.client else None)
        write_activity(
            kind=classify(request.method, request.url.path),
            method=request.method,
            path=request.url.path,
            source_ip=ip,
            actor=actor_from_auth(request.headers.get("authorization")),
            status=response.status_code,
            duration_ms=int((time.monotonic() - start) * 1000),
            summary=f"{request.method} {request.url.path}",
            detail={"query": _redact_qs(request.url.query), "ua": request.headers.get("user-agent")},
        )
    except Exception as e:
        print(f"activity capture failed: {e}")
    return response

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(apps.router, prefix="/apps", tags=["apps"])
app.include_router(embed.router, prefix="/embed", tags=["embed"])
app.include_router(activity.router, prefix="/activity", tags=["activity"])
app.include_router(desktop.router, prefix="/desktop", tags=["desktop"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])

@app.on_event("startup")
async def _tune_threadpool():
    # Pin the sync threadpool to match the DB pool ceiling (40). Sync endpoints
    # run here and each may hold a DB connection; keeping workers <= connections
    # prevents the pool-starvation deadlock that parked sessions idle-in-txn.
    try:
        import anyio.to_thread
        anyio.to_thread.current_default_thread_limiter().total_tokens = 40
    except Exception as e:
        print(f"threadpool tune skipped: {e}")


@app.get("/")
def read_root():
    return {"message": "Welcome to Dev-Hub API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
