import time
from typing import Optional
from urllib.parse import parse_qsl, urlencode
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import HTMLResponse
from migrate import init_db
from routers import auth, apps, embed, activity, desktop, notifications, api_keys, infra, mcp_server
from activity_log import write_activity, actor_from_auth, classify, excluded, SENSITIVE_SUBSTR
from docs_page import render_docs_page
from seed import seed

# Create tables + apply column migrations before anything queries the DB.
init_db()

# Auto-seed on startup
try:
    seed()
except Exception as e:
    print(f"Seeding error (may be normal on first run): {e}")

# root_path="/api": nginx serves the backend under /api/ with the prefix
# stripped, so the OpenAPI document must advertise that base or the docs page's
# Try-it (and any generated client) targets the SPA instead of the API. The
# stock docs are disabled in favour of the themed page below.
app = FastAPI(title="Dev-Hub API", root_path="/api", docs_url=None, redoc_url=None)

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
app.include_router(api_keys.router, prefix="/keys", tags=["keys"])
app.include_router(infra.router, prefix="/infra", tags=["infra"])
app.include_router(mcp_server.router, tags=["mcp"])  # POST/DELETE /mcp


@app.get("/docs", include_in_schema=False)
def swagger_docs(theme: Optional[str] = None):
    """Themed Swagger UI. The spec is loaded via a RELATIVE url so it resolves
    under /api/ through the proxy and also when hitting the backend directly."""
    return HTMLResponse(render_docs_page(theme))


def _openapi_with_auth():
    """Default schema + a bearer security scheme, so the docs page's Authorize
    button accepts a pasted JWT or devhub_ API key and Try-it sends it as an
    Authorization header. Public read endpoints still work without it."""
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title, version=app.version, description=app.description,
        routes=app.routes, servers=app.servers,
    )
    schema.setdefault("components", {}).setdefault("securitySchemes", {})["bearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "description": "A JWT from POST /auth/login, or a devhub_ API key from POST /keys/.",
    }
    schema["security"] = [{"bearerAuth": []}]
    app.openapi_schema = schema
    return schema


app.openapi = _openapi_with_auth

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
    # Start the desktop App-health board's background refresher (probes each app
    # off-request every 60s and caches the result; guarded, never crashes boot).
    try:
        desktop.start_health_refresher()
    except Exception as e:
        print(f"health refresher start skipped: {e}")


@app.get("/")
def read_root():
    return {"message": "Welcome to Dev-Hub API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
