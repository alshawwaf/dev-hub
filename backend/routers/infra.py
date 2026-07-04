"""Infrastructure integration: the Dokploy control plane behind the lab.

Admin-only configuration (URL + API token, encrypted at rest via HubSetting) and
a minimal Dokploy REST client used by the app lifecycle endpoints (status /
start / stop / restart / redeploy) and the MCP tools. The token is never
returned by any endpoint — only a configured/ok/error summary.

Route paths were verified against the lab's installed Dokploy v0.29.7 (tRPC
procedure names extracted from its built bundles + live 401-gated /api probe):
  - auth header:  x-api-key: <token>          (base <url>/api)
  - queries are GET with query-string params; mutations are POST with a JSON body
  - application.reload requires BOTH applicationId and appName (fetched first)
  - compose has start/stop/deploy/redeploy but NO reload/restart
"""
from urllib.parse import urlparse
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from db import models
from db.database import get_db
import schemas
from settings_store import get_setting, set_setting
from .auth import get_current_admin_user
from .notifications import emit

router = APIRouter()

# --------------------------------------------------------------------------- #
# Dokploy API surface — ALL paths in one place so a version mismatch is a
# one-line fix. Confirmed against Dokploy v0.29.7 on the lab host.
# --------------------------------------------------------------------------- #
DOKPLOY_ROUTES = {
    "project_all":          ("GET",  "/project.all"),
    "application_one":      ("GET",  "/application.one"),        # ?applicationId=
    "application_start":    ("POST", "/application.start"),      # {applicationId}
    "application_stop":     ("POST", "/application.stop"),       # {applicationId}
    "application_reload":   ("POST", "/application.reload"),     # {applicationId, appName}
    "application_redeploy": ("POST", "/application.redeploy"),   # {applicationId}
    "compose_one":          ("GET",  "/compose.one"),            # ?composeId=
    "compose_start":        ("POST", "/compose.start"),          # {composeId}
    "compose_stop":         ("POST", "/compose.stop"),           # {composeId}
    "compose_redeploy":     ("POST", "/compose.redeploy"),       # {composeId}
}

SETTING_URL = "dokploy_url"
SETTING_TOKEN = "dokploy_token"


class DokployError(Exception):
    """A failed Dokploy call, carrying a human-readable reason."""


def _dokploy_call(url: str, token: str, route: str, params: dict = None, body: dict = None):
    """One Dokploy API call. TLS is always verified; redirects are not followed
    (the API never redirects — a 3xx means a misconfigured URL, not a hop to
    chase). Raises DokployError with a readable reason on any failure."""
    method, path = DOKPLOY_ROUTES[route]
    try:
        with httpx.Client(verify=True, timeout=10.0, follow_redirects=False) as client:
            resp = client.request(
                method, f"{url}/api{path}", params=params, json=body,
                headers={"x-api-key": token, "accept": "application/json"},
            )
    except httpx.RequestError as e:
        raise DokployError(f"Dokploy is unreachable at {url}: {e.__class__.__name__}")
    if resp.status_code == 401:
        raise DokployError("Dokploy rejected the API token (401)")
    if resp.status_code >= 400:
        detail = resp.text[:200] if resp.text else ""
        raise DokployError(f"Dokploy returned HTTP {resp.status_code} for {path} {detail}".strip())
    try:
        return resp.json()
    except ValueError:
        raise DokployError(f"Dokploy returned a non-JSON response for {path}")


def _config(db: Session):
    """(url, token) from the encrypted settings store; either may be None."""
    return get_setting(db, SETTING_URL), get_setting(db, SETTING_TOKEN)


def _status_summary(db: Session):
    """The GET/PUT /dokploy response shape: configured/url/ok/error — never the
    token. When configured, runs a cheap live auth check (project.all)."""
    url, token = _config(db)
    configured = bool(url and token)
    out = {"configured": configured, "url": url or None, "ok": None, "error": None}
    if configured:
        try:
            _dokploy_call(url, token, "project_all")
            out["ok"] = True
        except DokployError as e:
            out["ok"] = False
            out["error"] = str(e)
    return out


# --------------------------------------------------------------------------- #
# Shared lifecycle helpers — used by the REST endpoints in apps.py AND the MCP
# tools, so both surfaces behave identically.
# --------------------------------------------------------------------------- #

# Dokploy applicationStatus/composeStatus -> the hub's coarse state. "done" is a
# finished deployment (the service is up), "idle" means never deployed / stopped.
_STATE_MAP = {"running": "running", "done": "running", "idle": "stopped", "error": "error"}


def get_app_status(db: Session, app: models.Application) -> dict:
    """{mapped, state, detail} for one app. Unmapped app or unconfigured Dokploy
    -> mapped:false/unknown; a failed Dokploy call -> mapped:true/unknown with the
    reason in detail (never raises)."""
    kind, dep_id = getattr(app, "deploy_kind", None), getattr(app, "deploy_id", None)
    if kind not in ("application", "compose") or not dep_id:
        return {"mapped": False, "state": "unknown", "detail": None}
    url, token = _config(db)
    if not (url and token):
        return {"mapped": False, "state": "unknown", "detail": "Dokploy isn't configured"}
    try:
        if kind == "application":
            data = _dokploy_call(url, token, "application_one", params={"applicationId": dep_id})
            raw = (data or {}).get("applicationStatus")
        else:
            data = _dokploy_call(url, token, "compose_one", params={"composeId": dep_id})
            raw = (data or {}).get("composeStatus")
    except DokployError as e:
        return {"mapped": True, "state": "unknown", "detail": str(e)}
    state = _STATE_MAP.get(raw or "", "unknown")
    return {"mapped": True, "state": state, "detail": f"Dokploy status: {raw}" if raw else None}


def own_host_of(request: Request) -> str:
    """The hostname the hub itself is being served on (proxy-aware), lowercased,
    port stripped — used by the self-protection guard."""
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    return host.split(",")[0].strip().split(":")[0].lower()


def perform_power(db: Session, app: models.Application, action: str, own_host: str, actor: str) -> dict:
    """Run start/stop/restart/redeploy on the Dokploy service mapped to `app`.
    Raises HTTPException(400) for anything the caller got wrong (unmapped,
    unconfigured, unsupported action, self-power) and DokployError when Dokploy
    itself fails. Returns {ok: True, message} on success."""
    if action not in ("start", "stop", "restart", "redeploy"):
        raise HTTPException(status_code=400, detail=f"Unknown power action: {action}")
    # Self-protection: never let the hub power itself off (or even "restart" —
    # a redeploy kills the very backend serving this request).
    app_host = (urlparse(app.url).hostname or "").lower() if app.url else ""
    if app_host and own_host and app_host == own_host:
        raise HTTPException(status_code=400,
                            detail="Refusing to run power actions against the hub itself")
    kind, dep_id = getattr(app, "deploy_kind", None), getattr(app, "deploy_id", None)
    if kind not in ("application", "compose") or not dep_id:
        raise HTTPException(status_code=400,
                            detail="This app isn't mapped to a Dokploy service — set deploy_kind/deploy_id first")
    url, token = _config(db)
    if not (url and token):
        raise HTTPException(status_code=400, detail="Dokploy isn't configured — set it up under /infra/dokploy")

    if kind == "application":
        if action == "restart":
            # application.reload requires the service's appName alongside its id.
            one = _dokploy_call(url, token, "application_one", params={"applicationId": dep_id})
            app_name = (one or {}).get("appName")
            if not app_name:
                raise DokployError("Couldn't resolve the Dokploy appName needed for a restart")
            _dokploy_call(url, token, "application_reload",
                          body={"applicationId": dep_id, "appName": app_name})
        else:
            _dokploy_call(url, token, f"application_{action}", body={"applicationId": dep_id})
    else:
        if action == "restart":
            # Honest 400: Dokploy v0.29.7 has no compose reload/restart.
            raise HTTPException(status_code=400,
                                detail="restart isn't supported for compose services — use redeploy")
        _dokploy_call(url, token, f"compose_{action}", body={"composeId": dep_id})

    verb = {"start": "started", "stop": "stopped", "restart": "restarted", "redeploy": "redeployed"}[action]
    emit(db, f"App “{app.name}” {verb} by {actor}", "warning" if action == "stop" else "info")
    return {"ok": True, "message": f"{app.name} {verb}"}


# --------------------------------------------------------------------------- #
# Admin endpoints
# --------------------------------------------------------------------------- #

@router.get("/dokploy")
def get_dokploy_config(db: Session = Depends(get_db),
                       admin: schemas.User = Depends(get_current_admin_user)):
    """Current Dokploy wiring + a live auth check. The token itself is never
    returned — only whether one is stored and whether it works."""
    return _status_summary(db)


@router.put("/dokploy")
def set_dokploy_config(body: schemas.DokployConfigIn, db: Session = Depends(get_db),
                       admin: schemas.User = Depends(get_current_admin_user)):
    """Store the Dokploy URL + token (encrypted at rest) and test the connection.
    An empty token with one already stored keeps the stored token, so an admin
    can update the URL without re-pasting the secret."""
    url = (body.url or "").strip().rstrip("/")
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")
    token = (body.token or "").strip()
    if not token:
        token = get_setting(db, SETTING_TOKEN)
        if not token:
            raise HTTPException(status_code=400, detail="An API token is required")
        set_setting(db, SETTING_URL, url)
    else:
        set_setting(db, SETTING_URL, url)
        set_setting(db, SETTING_TOKEN, token)
    emit(db, f"Dokploy connection updated by {admin.email}", "info")
    return _status_summary(db)


@router.get("/dokploy/targets")
def list_dokploy_targets(db: Session = Depends(get_db),
                         admin: schemas.User = Depends(get_current_admin_user)):
    """Deployable services for the app-mapping picker, pulled live from Dokploy.
    v0.29.7 nests services under project -> environments -> applications/compose;
    older versions kept them directly on the project, so both shapes are walked."""
    url, token = _config(db)
    if not (url and token):
        raise HTTPException(status_code=400, detail="Dokploy isn't configured")
    try:
        projects = _dokploy_call(url, token, "project_all")
    except DokployError as e:
        raise HTTPException(status_code=502, detail=str(e))
    targets = []
    # The control plane is trusted, but a malformed/older payload shouldn't 500
    # the picker — skip anything that isn't the dict shape we expect, and drop
    # entries without an id (unusable for mapping).
    for proj in projects if isinstance(projects, list) else []:
        if not isinstance(proj, dict):
            continue
        pname = proj.get("name") or "?"
        envs = proj.get("environments")
        for bucket in (envs if isinstance(envs, list) else [proj]):
            if not isinstance(bucket, dict):
                continue
            for a in bucket.get("applications") or []:
                if isinstance(a, dict) and a.get("applicationId"):
                    targets.append({"kind": "application", "id": a.get("applicationId"),
                                    "name": a.get("name"), "project": pname})
            for c in bucket.get("compose") or []:
                if isinstance(c, dict) and c.get("composeId"):
                    targets.append({"kind": "compose", "id": c.get("composeId"),
                                    "name": c.get("name"), "project": pname})
    return targets
