"""Same-origin reverse proxy so apps that refuse cross-origin framing
(X-Frame-Options / CSP frame-ancestors) can run inside a desktop window.

The iframe points at /embed/{app_id}/...  (same origin as the hub), this relays
to the registered app's real URL, and strips the anti-framing headers on the way
back. Security posture:
  - target is NEVER user-controlled — only an admin-registered app's URL, and
    only when that app has proxy_embed enabled (no open proxy / SSRF surface);
  - upstream TLS is always verified (never disabled);
  - redirects are not followed (Location is rewritten instead) to block
    redirect-based SSRF;
  - hop-by-hop and sensitive headers are stripped both ways;
  - request and response bodies are capped.

NOTE: a single-page app served from its own root (n8n) uses absolute asset paths
(/assets/...) that won't resolve under /embed/{id}/. Such apps must be told their
base path (e.g. n8n: N8N_PATH=/embed/{id}). A <base href> is injected to fix
relative URLs, but absolute-root apps still need the base-path env. Static/doc
apps and apps that honour a base path work as-is.
"""
import re
import httpx
import websockets
from fastapi import APIRouter, Request, Response, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse
from db import models
from db.database import get_db, SessionLocal

router = APIRouter()

MAX_BODY = 8 * 1024 * 1024  # 8 MB cap each way
REQUEST_STRIP = {"host", "cookie", "content-length", "connection", "accept-encoding",
                 "x-forwarded-host", "x-forwarded-proto", "x-forwarded-for", "x-real-ip"}
RESPONSE_STRIP = {"x-frame-options", "content-security-policy", "content-security-policy-report-only",
                  "content-length", "connection", "transfer-encoding", "keep-alive",
                  "content-encoding", "strict-transport-security"}


def _target_base(app_id: int, db: Session) -> str:
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app or not getattr(app, "proxy_embed", False) or not app.url:
        raise HTTPException(status_code=404, detail="App not found or not proxy-embeddable")
    url = app.url.rstrip("/")
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=404, detail="App URL is not http(s)")
    return url


def _rewrite_set_cookie(value: str, prefix: str) -> str:
    # force cookies to the proxied path, drop Domain so they bind to the hub host
    parts = [p for p in value.split(";") if p.strip().lower().split("=")[0].strip() != "domain"]
    out, has_path = [], False
    for p in parts:
        if p.strip().lower().startswith("path="):
            out.append(f" Path={prefix}")
            has_path = True
        else:
            out.append(p)
    if not has_path:
        out.append(f" Path={prefix}")
    return ";".join(out)


@router.api_route("/{app_id}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
async def proxy(app_id: int, path: str, request: Request, db: Session = Depends(get_db)):
    base = _target_base(app_id, db)
    # Release the DB transaction before the (potentially slow) upstream call so
    # the pooled connection isn't held "idle in transaction" during the await.
    db.rollback()
    prefix = f"/embed/{app_id}/"
    target = f"{base}/{path}"
    if request.url.query:
        target += f"?{request.url.query}"

    body = await request.body()
    if len(body) > MAX_BODY:
        raise HTTPException(status_code=413, detail="Request too large")
    headers = {k: v for k, v in request.headers.items() if k.lower() not in REQUEST_STRIP}

    try:
        async with httpx.AsyncClient(verify=True, follow_redirects=False, timeout=30.0) as client:
            upstream = await client.request(request.method, target, content=body, headers=headers)
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Upstream unreachable")

    out_headers = {}
    for k, v in upstream.headers.items():
        kl = k.lower()
        if kl in RESPONSE_STRIP:
            continue
        if kl == "set-cookie":
            out_headers["set-cookie"] = _rewrite_set_cookie(v, prefix)
        elif kl == "location":
            # rewrite redirects back under the proxy prefix
            loc = v
            if loc.startswith(base):
                loc = prefix + loc[len(base):].lstrip("/")
            elif loc.startswith("/"):
                loc = prefix + loc.lstrip("/")
            out_headers["location"] = loc
        else:
            out_headers[k] = v
    out_headers["content-security-policy"] = "frame-ancestors 'self'"

    content = upstream.content[:MAX_BODY]
    ctype = upstream.headers.get("content-type", "")
    if "text/html" in ctype:
        html = content.decode(upstream.encoding or "utf-8", errors="replace")
        if "<base " not in html.lower():
            html = re.sub(r"(<head[^>]*>)", rf"\1<base href=\"{prefix}\">", html, count=1, flags=re.IGNORECASE)
        # Route absolute-root asset/link refs (src="/...", href="/...") back through
        # the proxy. Skips protocol-relative (//) and already-prefixed (/embed/) refs.
        # NOTE: this fixes refs in the served HTML; URLs an SPA builds at runtime in
        # JS still need the app's own base-path env (e.g. n8n N8N_PATH).
        html = re.sub(r'((?:src|href)=["\'])/(?!/|embed/)', lambda m: m.group(1) + prefix, html)
        return Response(content=html, status_code=upstream.status_code, headers=out_headers, media_type=ctype)

    return StreamingResponse(iter([content]), status_code=upstream.status_code, headers=out_headers, media_type=ctype or None)


@router.websocket("/{app_id}/{path:path}")
async def proxy_ws(websocket: WebSocket, app_id: int, path: str):
    db = SessionLocal()
    try:
        try:
            base = _target_base(app_id, db)
        except HTTPException:
            await websocket.close(code=1008)
            return
    finally:
        db.close()

    ws_base = base.replace("https://", "wss://", 1).replace("http://", "ws://", 1)
    target = f"{ws_base}/{path}"
    if websocket.url.query:
        target += f"?{websocket.url.query}"

    await websocket.accept()
    try:
        async with websockets.connect(target, open_timeout=15) as upstream:
            import asyncio

            async def client_to_upstream():
                try:
                    while True:
                        msg = await websocket.receive_text()
                        await upstream.send(msg)
                except WebSocketDisconnect:
                    await upstream.close()

            async def upstream_to_client():
                try:
                    async for msg in upstream:
                        await websocket.send_text(msg if isinstance(msg, str) else msg.decode("utf-8", "replace"))
                except Exception:
                    pass

            await asyncio.gather(client_to_upstream(), upstream_to_client())
    except Exception:
        try:
            await websocket.close()
        except Exception:
            pass
