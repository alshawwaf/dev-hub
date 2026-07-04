"""Hand-rolled MCP server (Streamable HTTP, JSON-RPC 2.0) at POST /mcp.

No SDK — the `mcp` package isn't installable here, and the protocol subset an
agent gateway needs (initialize / notifications / tools/list / tools/call) is
small enough to speak directly, same pattern as the playground's reference
server. Tools are thin wrappers over the SAME functions the REST endpoints use,
so both surfaces behave identically.

Auth: Authorization: Bearer <devhub_ API key> (primary story) or a JWT. Keys are
validated hash/revoked/expiry directly — the central METHOD gate in auth.py
would block read-only keys here (everything is a POST), and MCP scope rules are
per-TOOL instead: any valid credential may call read tools; create/update/
delete/power need admin authority. This path is NOT excluded from activity
logging (see activity_log.EXCLUDED_PREFIXES).
"""
import hashlib
import json
import uuid

from fastapi import APIRouter, Request, Response
from fastapi.exceptions import HTTPException
from jose import JWTError, jwt
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from db import models
from db.database import SessionLocal
import schemas
from .auth import SECRET_KEY, ALGORITHM, _utcnow, _as_aware
from . import apps as apps_router
from . import infra

router = APIRouter()

PROTOCOL_VERSIONS = ("2024-11-05", "2025-03-26", "2025-06-18")
DEFAULT_PROTOCOL = "2025-03-26"
SERVER_INFO = {"name": "devhub-mcp", "version": "1.0.0"}

_NAME_OR_ID = {"type": "string", "description": "App id (e.g. \"3\") or app name (case-insensitive)"}

# App fields an agent may set. embed_url is accepted on create/update (encrypted
# at rest by the reused REST logic) but NEVER returned by any read tool.
_APP_FIELDS = {
    "name": {"type": "string"},
    "description": {"type": "string"},
    "url": {"type": "string"},
    "github_url": {"type": "string"},
    "category": {"type": "string"},
    "icon": {"type": "string"},
    "is_live": {"type": "boolean"},
    "embeddable": {"type": "boolean"},
    "placement": {"type": "string", "enum": ["desktop", "dock", "both", "hidden"]},
    "proxy_embed": {"type": "boolean"},
    "embed_url": {"type": "string"},
    "deploy_kind": {"type": "string", "enum": ["application", "compose"]},
    "deploy_id": {"type": "string"},
}


def _app_public(a: models.Application) -> dict:
    """Public projection of an app — mirrors schemas.App; embed_url stays server-side."""
    return {
        "id": a.id, "name": a.name, "description": a.description, "url": a.url,
        "github_url": a.github_url, "category": a.category, "icon": a.icon,
        "is_live": a.is_live, "embeddable": a.embeddable, "placement": a.placement,
        "proxy_embed": a.proxy_embed, "has_embed_url": bool(a.embed_url),
        "deploy_kind": getattr(a, "deploy_kind", None), "deploy_id": getattr(a, "deploy_id", None),
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


def _resolve_app(db, ident) -> models.Application:
    """name_or_id -> Application row. Numeric strings try the id first, then a
    case-insensitive name match. Raises ValueError when nothing matches."""
    if ident is None or str(ident).strip() == "":
        raise ValueError("name_or_id is required")
    ident = str(ident).strip()
    if ident.isdigit():
        row = db.query(models.Application).filter(models.Application.id == int(ident)).first()
        if row:
            return row
    from sqlalchemy import func as sqlfunc
    row = db.query(models.Application).filter(
        sqlfunc.lower(models.Application.name) == ident.lower()).first()
    if row is None:
        raise ValueError(f"No app matches {ident!r}")
    return row


# --------------------------------------------------------------------------- #
# Tool registry — name -> schema + handler(db, user, request, args).
# scope "read": any valid credential. scope "admin": admin JWT session or an
# admin-scoped key (checked in _tool_allowed).
# --------------------------------------------------------------------------- #

def _t_list_apps(db, user, request, args):
    return [_app_public(a) for a in db.query(models.Application).all()]


def _t_get_app(db, user, request, args):
    return _app_public(_resolve_app(db, args.get("name_or_id")))


def _t_probe_app(db, user, request, args):
    row = _resolve_app(db, args.get("name_or_id"))
    return apps_router.probe_app(app_id=row.id, request=request, db=db, user=user)


def _t_app_status(db, user, request, args):
    return infra.get_app_status(db, _resolve_app(db, args.get("name_or_id")))


def _t_create_app(db, user, request, args):
    model = schemas.AppCreate(**{k: v for k, v in (args or {}).items() if k in _APP_FIELDS})
    return _app_public(apps_router.create_app(app=model, db=db, current_user=user))


def _t_update_app(db, user, request, args):
    row = _resolve_app(db, args.get("name_or_id"))
    fields = {k: v for k, v in (args or {}).items() if k in _APP_FIELDS}
    if not fields:
        raise ValueError("Nothing to update — pass at least one app field")
    model = schemas.AppUpdate(**fields)
    return _app_public(apps_router.update_app(app_id=row.id, app_update=model, db=db, current_user=user))


def _t_delete_app(db, user, request, args):
    row = _resolve_app(db, args.get("name_or_id"))
    return apps_router.delete_app(app_id=row.id, db=db, current_user=user)


def _t_power_action(db, user, request, args):
    row = _resolve_app(db, args.get("name_or_id"))
    action = (args or {}).get("action")
    if action not in ("start", "stop", "restart", "redeploy"):
        raise ValueError("action must be one of start | stop | restart | redeploy")
    # Same guard path as POST /apps/{id}/power, self-protection included.
    return infra.perform_power(db, row, action, infra.own_host_of(request), user.email)


TOOLS = {
    "list_apps": {
        "description": "List every registered app with its public fields.",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
        "scope": "read", "handler": _t_list_apps,
    },
    "get_app": {
        "description": "Get one app by id or name.",
        "inputSchema": {"type": "object", "properties": {"name_or_id": _NAME_OR_ID},
                        "required": ["name_or_id"], "additionalProperties": False},
        "scope": "read", "handler": _t_get_app,
    },
    "probe_app": {
        "description": "Server-side reachability + framing probe of an app's URL "
                       "(same logic as the desktop's offline/blocked card).",
        "inputSchema": {"type": "object", "properties": {"name_or_id": _NAME_OR_ID},
                        "required": ["name_or_id"], "additionalProperties": False},
        "scope": "read", "handler": _t_probe_app,
    },
    "app_status": {
        "description": "Live Dokploy state for a mapped app: {mapped, state, detail}.",
        "inputSchema": {"type": "object", "properties": {"name_or_id": _NAME_OR_ID},
                        "required": ["name_or_id"], "additionalProperties": False},
        "scope": "read", "handler": _t_app_status,
    },
    "create_app": {
        "description": "Register a new app on the hub (admin).",
        "inputSchema": {"type": "object", "properties": dict(_APP_FIELDS),
                        "required": ["name"], "additionalProperties": False},
        "scope": "admin", "handler": _t_create_app,
    },
    "update_app": {
        "description": "Update fields on an existing app (admin).",
        "inputSchema": {"type": "object",
                        "properties": {"name_or_id": _NAME_OR_ID, **_APP_FIELDS},
                        "required": ["name_or_id"], "additionalProperties": False},
        "scope": "admin", "handler": _t_update_app,
    },
    "delete_app": {
        "description": "Delete an app from the hub (admin).",
        "inputSchema": {"type": "object", "properties": {"name_or_id": _NAME_OR_ID},
                        "required": ["name_or_id"], "additionalProperties": False},
        "scope": "admin", "handler": _t_delete_app,
    },
    "power_action": {
        "description": "Start/stop/restart/redeploy the Dokploy service mapped to an app (admin). "
                       "The hub refuses to power itself.",
        "inputSchema": {"type": "object",
                        "properties": {"name_or_id": _NAME_OR_ID,
                                       "action": {"type": "string",
                                                  "enum": ["start", "stop", "restart", "redeploy"]}},
                        "required": ["name_or_id", "action"], "additionalProperties": False},
        "scope": "admin", "handler": _t_power_action,
    },
}


# --------------------------------------------------------------------------- #
# Auth — key validated directly (no METHOD gate: everything here is a POST and
# scope rules are per tool). JWT sessions also accepted.
# --------------------------------------------------------------------------- #

def _authenticate(db, request: Request):
    """-> (user, kind, scopes) or None. kind is "key"|"jwt"; scopes only for keys."""
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        return None
    token = header.split(" ", 1)[1].strip()
    if token.startswith("devhub_"):
        key_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        row = db.query(models.ApiKey).filter(
            models.ApiKey.key_hash == key_hash,
            models.ApiKey.revoked == False,  # noqa: E712
        ).first()
        if row is None:
            return None
        now = _utcnow()
        if row.expires_at is not None and _as_aware(row.expires_at) <= now:
            return None
        user = db.query(models.User).filter(models.User.id == row.owner_id).first()
        if user is None:
            return None
        if row.last_used_at is None or (now - _as_aware(row.last_used_at)).total_seconds() > 60:
            try:
                row.last_used_at = now
                db.commit()
            except Exception:
                db.rollback()
        return user, "key", list(row.scopes or [])
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
    except JWTError:
        return None
    if not email:
        return None
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        return None
    return user, "jwt", []


def _tool_allowed(tool: dict, user, kind: str, scopes: list):
    """None when allowed, else the denial message for the tool-error result."""
    if tool["scope"] == "read":
        return None
    if kind == "key":
        if "admin" not in scopes:
            return "This API key lacks the admin scope required by this tool"
        if not user.is_admin:
            return "The key's owner is not an administrator"
        return None
    return None if user.is_admin else "Administrator privileges required"


# --------------------------------------------------------------------------- #
# JSON-RPC plumbing
# --------------------------------------------------------------------------- #

def _rpc_error(mid, code, message):
    return {"jsonrpc": "2.0", "id": mid, "error": {"code": code, "message": message}}


def _tool_result(mid, payload, is_error=False):
    text = payload if isinstance(payload, str) else json.dumps(payload, indent=2, default=str)
    return {"jsonrpc": "2.0", "id": mid,
            "result": {"content": [{"type": "text", "text": text}], "isError": is_error}}


def _reply(payload, wants_sse: bool, status: int = 200, session_id: str = None) -> Response:
    """Frame one JSON-RPC message per the client's Accept header: an SSE event
    when it asked for text/event-stream, plain JSON otherwise."""
    headers = {"mcp-session-id": session_id} if session_id else {}
    if wants_sse:
        body = f"event: message\ndata: {json.dumps(payload)}\n\n"
        return Response(content=body, status_code=status, media_type="text/event-stream", headers=headers)
    return Response(content=json.dumps(payload), status_code=status,
                    media_type="application/json", headers=headers)


def _dispatch(msg: dict, db, user, kind, scopes, request: Request):
    """One parsed JSON-RPC request -> response dict, or None for notifications."""
    method = msg.get("method")
    mid = msg.get("id")

    if method == "initialize":
        client_ver = ((msg.get("params") or {}).get("protocolVersion")) or DEFAULT_PROTOCOL
        return {"jsonrpc": "2.0", "id": mid, "result": {
            "protocolVersion": client_ver if client_ver in PROTOCOL_VERSIONS else DEFAULT_PROTOCOL,
            "capabilities": {"tools": {}},
            "serverInfo": SERVER_INFO,
        }}

    if isinstance(method, str) and method.startswith("notifications/"):
        return None  # notifications get no body (202 at the transport layer)

    if method == "tools/list":
        tools = [{"name": n, "description": t["description"], "inputSchema": t["inputSchema"]}
                 for n, t in TOOLS.items()]
        return {"jsonrpc": "2.0", "id": mid, "result": {"tools": tools}}

    if method == "tools/call":
        params = msg.get("params")
        if not isinstance(params, dict) or not params.get("name"):
            return _rpc_error(mid, -32602, "tools/call needs params.name")
        tool = TOOLS.get(params["name"])
        if tool is None:
            return _rpc_error(mid, -32602, f"Unknown tool: {params['name']}")
        denied = _tool_allowed(tool, user, kind, scopes)
        if denied:
            return _tool_result(mid, f"Forbidden: {denied}", is_error=True)
        args = params.get("arguments") or {}
        if not isinstance(args, dict):
            return _rpc_error(mid, -32602, "params.arguments must be an object")
        try:
            return _tool_result(mid, tool["handler"](db, user, request, args))
        except (ValueError, ValidationError) as e:
            return _tool_result(mid, f"Invalid arguments: {e}", is_error=True)
        except HTTPException as e:  # reused REST logic signals errors this way
            return _tool_result(mid, f"Error {e.status_code}: {e.detail}", is_error=True)
        except infra.DokployError as e:
            return _tool_result(mid, f"Dokploy error: {e}", is_error=True)
        except Exception as e:  # tool failures are results, never a transport crash
            return _tool_result(mid, f"Error: {e}", is_error=True)

    return _rpc_error(mid, -32601, f"Method not found: {method}")


def _handle(request: Request, raw: bytes, wants_sse: bool) -> Response:
    """Sync worker for one POST /mcp — parse, authenticate, dispatch. Runs in the
    threadpool so its DB work never blocks the event loop."""
    try:
        msg = json.loads(raw or b"{}")
    except json.JSONDecodeError:
        return _reply(_rpc_error(None, -32700, "Parse error"), wants_sse, status=400)
    if not isinstance(msg, dict):
        return _reply(_rpc_error(None, -32600, "A single JSON-RPC request object is expected"),
                      wants_sse, status=400)

    db = SessionLocal()
    try:
        auth = _authenticate(db, request)
        if auth is None:
            return _reply(_rpc_error(msg.get("id"), -32001,
                                     "Unauthorized: send Authorization: Bearer <devhub_ API key or JWT>"),
                          wants_sse, status=401)
        user, kind, scopes = auth
        session_id = uuid.uuid4().hex if msg.get("method") == "initialize" else None
        resp = _dispatch(msg, db, user, kind, scopes, request)
        if resp is None:  # a notification — acknowledge with an empty 202
            return Response(status_code=202)
        return _reply(resp, wants_sse, session_id=session_id)
    finally:
        db.close()


@router.post("/mcp")
async def mcp_endpoint(request: Request):
    raw = await request.body()
    wants_sse = "text/event-stream" in (request.headers.get("accept") or "")
    return await run_in_threadpool(_handle, request, raw, wants_sse)


def _teardown(request: Request) -> Response:
    # Same direct credential check as POST (the central METHOD gate would 403 a
    # read-only key's DELETE, and gateways tear down with the same key they call with).
    db = SessionLocal()
    try:
        if _authenticate(db, request) is None:
            return Response(content=json.dumps({"detail": "Unauthorized"}), status_code=401,
                            media_type="application/json")
    finally:
        db.close()
    return Response(content=json.dumps({"ok": True}), media_type="application/json")


@router.delete("/mcp")
async def mcp_teardown(request: Request):
    # Session teardown is a no-op (the server is stateless) but gateways send it.
    return await run_in_threadpool(_teardown, request)
