import re
import httpx
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from db import models
from db.database import get_db
import schemas
import crypto
from .auth import get_current_admin_user, read_users_me
from .notifications import emit

router = APIRouter()

@router.get("/", response_model=List[schemas.App])
def get_apps(db: Session = Depends(get_db)):
    return db.query(models.Application).all()

@router.post("/", response_model=schemas.App)
def create_app(app: schemas.AppCreate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_admin_user)):
    data = app.dict()
    embed_url = data.pop("embed_url", None)
    db_app = models.Application(**data)
    db_app.embed_url = crypto.encrypt(embed_url)  # encrypt at rest (None if empty)
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    emit(db, f"Application “{db_app.name}” added by {current_user.email}", "success")
    return db_app

@router.put("/{app_id}", response_model=schemas.App)
def update_app(app_id: int, app_update: schemas.AppUpdate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_admin_user)):
    db_app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")

    update_data = app_update.dict(exclude_unset=True)
    # embed_url is only touched when the client explicitly sends it; encrypt or
    # clear. Omitting the field leaves the stored (encrypted) value untouched.
    if "embed_url" in update_data:
        db_app.embed_url = crypto.encrypt(update_data.pop("embed_url"))
    for key, value in update_data.items():
        setattr(db_app, key, value)

    db.commit()
    db.refresh(db_app)
    emit(db, f"Application “{db_app.name}” updated by {current_user.email}", "info")
    return db_app

@router.get("/{app_id}/embed")
def get_embed_url(app_id: int, db: Session = Depends(get_db), user: schemas.User = Depends(read_users_me)):
    """Return the decrypted embed URL (may carry a token) — authenticated only,
    so it is never exposed via the public app list."""
    db_app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"embed_url": crypto.decrypt(db_app.embed_url)}

def _probe_origin(request: Request) -> str:
    """The hub's own public origin (what the browser frames from), derived from the
    incoming request so we can tell whether an app's frame-ancestors allows us."""
    origin = request.headers.get("origin")
    if origin:
        return origin.strip().lower().rstrip("/")
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    if not host:
        return ""
    proto = request.headers.get("x-forwarded-proto", "https").split(",")[0].strip()
    return f"{proto}://{host.split(',')[0].strip()}".lower().rstrip("/")


def _csp_allows_framing(csp: str, origin: str) -> bool:
    """Does this Content-Security-Policy's frame-ancestors allow `origin` to frame?
    Biased toward True on any uncertainty so we never hide an app that actually works."""
    m = re.search(r"frame-ancestors([^;]*)", csp)
    if not m:
        return True  # no directive → CSP does not restrict framing
    sources = m.group(1).split()
    if not sources or "*" in sources:
        return True
    if not origin:
        return True  # can't determine our own origin → don't block
    host = urlparse(origin).netloc
    for raw in sources:
        s = raw.strip().strip("'").lower()
        if s in ("", "self", "none"):
            continue
        netloc = urlparse(s if "//" in s else "//" + s).netloc or s
        if netloc == host:
            return True
        if netloc.startswith("*.") and host.endswith(netloc[1:]):
            return True
    return False


@router.get("/{app_id}/probe")
def probe_app(app_id: int, request: Request, db: Session = Depends(get_db),
              user: schemas.User = Depends(read_users_me)):
    """Server-side reachability + framing check so the desktop can show a clean
    'not deployed / offline / can't be framed' card instead of leaving a raw
    cross-origin error page inside the window.

    Auth-gated. Upstream TLS is always verified. Only the admin-registered app URL
    (never user input) is probed, and only its response headers are read. A verdict
    that HIDES the app requires a real HTTP response from the target (404 / 5xx /
    blocking headers); a bare connection failure returns 'offline', which the client
    treats as inconclusive and still tries to frame — so a backend that can't
    hairpin to a public host never hides a live app.
    """
    db_app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")

    target = crypto.decrypt(getattr(db_app, "embed_url", None)) or db_app.url
    if not target or not (target.startswith("http://") or target.startswith("https://")):
        return {"ok": False, "category": "error", "status": None,
                "reason": "No web URL is configured for this app."}

    origin_host = urlparse(target).netloc
    probe_headers = {"user-agent": "dev-hub-embed-probe/1.0", "accept": "text/html,*/*"}
    try:
        # follow_redirects=False + manual SAME-HOST following mirrors the /embed
        # proxy's SSRF stance: never let an upstream 3xx bounce us onto an internal
        # address. An off-host redirect means the app answered, so report it
        # reachable rather than chasing the Location.
        with httpx.Client(verify=True, follow_redirects=False,
                          timeout=httpx.Timeout(6.0, connect=3.0)) as client:
            resp = client.send(client.build_request("GET", target, headers=probe_headers), stream=True)
            hops = 0
            while resp.status_code in (301, 302, 303, 307, 308) and hops < 4:
                loc = resp.headers.get("location")
                resp.close()
                if not loc:
                    break
                nxt = httpx.URL(str(resp.url)).join(loc)
                if nxt.host != origin_host or nxt.scheme not in ("http", "https"):
                    return {"ok": True, "category": "ok", "status": 200, "reason": ""}
                resp = client.send(client.build_request("GET", str(nxt), headers=probe_headers), stream=True)
                hops += 1
            try:
                code = resp.status_code
                headers = {k.lower(): v for k, v in resp.headers.items()}
            finally:
                resp.close()
    except httpx.RequestError:
        return {"ok": False, "category": "offline", "status": None,
                "reason": "The app couldn’t be reached — it may be offline or still starting up."}

    if code == 404:
        return {"ok": False, "category": "notfound", "status": code,
                "reason": "The server has no route for this app (404) — it may not be deployed yet."}
    if code >= 500:
        return {"ok": False, "category": "error", "status": code,
                "reason": f"The app returned a server error (HTTP {code}). It may still be starting up."}

    # Reachable (2xx/3xx, or a 4xx that isn't 404 — e.g. an auth wall). Will the
    # browser let the hub frame it?
    origin = _probe_origin(request)
    xfo = (headers.get("x-frame-options") or "").lower()
    csp = (headers.get("content-security-policy") or "").lower()
    blocked = "deny" in xfo or "sameorigin" in xfo
    if not blocked and "frame-ancestors" in csp and not _csp_allows_framing(csp, origin):
        blocked = True
    if blocked:
        return {"ok": False, "category": "blocked", "status": code,
                "reason": "This app blocks being shown in a window — its server disables framing. "
                          "Open it in a new tab, or allow the hub in its frame-ancestors."}
    return {"ok": True, "category": "ok", "status": code, "reason": ""}


@router.get("/{app_id}/status")
def app_status(app_id: int, db: Session = Depends(get_db),
               current_user: schemas.User = Depends(get_current_admin_user)):
    """Live Dokploy state for a mapped app: {mapped, state, detail}. Unmapped or
    unconfigured -> mapped:false/state:"unknown" (never an error)."""
    from .infra import get_app_status
    db_app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")
    return get_app_status(db, db_app)


@router.post("/{app_id}/power")
def app_power(app_id: int, body: schemas.PowerAction, request: Request,
              db: Session = Depends(get_db),
              current_user: schemas.User = Depends(get_current_admin_user)):
    """Run start/stop/restart/redeploy on the app's mapped Dokploy service.
    400 for caller mistakes (unmapped/unconfigured/self-power/compose-restart);
    502 with ok:false when Dokploy itself fails."""
    from .infra import perform_power, own_host_of, DokployError
    db_app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")
    try:
        return perform_power(db, db_app, body.action, own_host_of(request), current_user.email)
    except DokployError as e:
        return JSONResponse(status_code=502, content={"ok": False, "message": str(e)})


@router.delete("/{app_id}")
def delete_app(app_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_admin_user)):
    db_app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    name = db_app.name
    db.delete(db_app)
    db.commit()
    emit(db, f"Application “{name}” deleted by {current_user.email}", "warning")
    return {"message": "Application deleted"}
