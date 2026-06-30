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
import html as _html
import re
import httpx
import websockets
from urllib.parse import urlparse
from fastapi import APIRouter, Request, Response, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse
from db import models
from db.database import SessionLocal

router = APIRouter()

MAX_BODY = 8 * 1024 * 1024  # 8 MB cap each way
# Drop hop-by-hop/forwarding headers AND the browser's fetch-metadata/origin
# headers — a strict upstream nginx rejects the proxied GET (403/405) when those
# are present; stripping them makes the request look plain server-to-server.
REQUEST_STRIP = {"host", "cookie", "content-length", "connection", "accept-encoding",
                 "x-forwarded-host", "x-forwarded-proto", "x-forwarded-for", "x-real-ip",
                 "origin", "referer", "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest",
                 "sec-fetch-user", "upgrade-insecure-requests"}
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


def get_target_base(app_id: int):
    # Sync dependency: FastAPI runs it in the threadpool, so the psycopg2 lookup
    # never blocks the event loop, and it opens+closes its own session — the
    # connection is back in the pool BEFORE the async handler's slow upstream
    # call (nothing held idle-in-transaction across the await). Returns (url, name).
    db = SessionLocal()
    try:
        app = db.query(models.Application).filter(models.Application.id == app_id).first()
        if not app or not getattr(app, "proxy_embed", False) or not app.url:
            raise HTTPException(status_code=404, detail="App not found or not proxy-embeddable")
        url = app.url.rstrip("/")
        if not (url.startswith("http://") or url.startswith("https://")):
            raise HTTPException(status_code=404, detail="App URL is not http(s)")
        return url, (app.name or "This app")
    finally:
        db.close()


def _error_page(app_name: str, app_url: str, code: int, reason: str) -> Response:
    """A branded, same-origin error document shown inside the window when an app
    can't be embedded — instead of relaying a raw vendor error page. Carries an
    x-devhub-embed-status marker the (same-origin) frontend reads to fall back to
    the launcher card."""
    name = _html.escape(app_name or "This app")
    href = _html.escape(app_url or "", quote=True)
    link = f'<a href="{href}" target="_blank" rel="noopener noreferrer">Open in new tab ↗</a>' if href else ''
    page = (
        '<!doctype html><html><head><meta charset="utf-8">'
        f'<meta name="x-devhub-embed-status" content="{code}">'
        '<style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;'
        "font:15px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#15151b;color:#e6e6ea}"
        '.c{max-width:420px;text-align:center;padding:32px}.k{font-size:12px;opacity:.5;letter-spacing:.08em;text-transform:uppercase}'
        'h1{font-size:18px;margin:12px 0 6px}p{opacity:.72;margin:0 0 22px;line-height:1.5}'
        'a{display:inline-block;padding:9px 18px;border-radius:9px;background:#7c3aed;color:#fff;text-decoration:none;font-weight:600}</style></head>'
        f'<body><div class="c"><div class="k">Upstream {code}</div><h1>{name} can’t be shown here</h1>'
        f'<p>{_html.escape(reason)}</p>{link}</div></body></html>'
    )
    return Response(content=page, status_code=200, media_type="text/html",
                    headers={"content-security-policy": "frame-ancestors 'self'", "cache-control": "no-store"})


@router.api_route("/{app_id}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
async def proxy(app_id: int, path: str, request: Request, target=Depends(get_target_base)):
    base, app_name = target
    prefix = f"/embed/{app_id}/"
    base_host = urlparse(base).netloc
    url = f"{base}/{path}"
    if request.url.query:
        url += f"?{request.url.query}"

    body = await request.body()
    if len(body) > MAX_BODY:
        raise HTTPException(status_code=413, detail="Request too large")
    headers = {k: v for k, v in request.headers.items() if k.lower() not in REQUEST_STRIP}
    method = request.method

    # Follow SAME-HOST redirects internally (a '/'→canonical 3xx would otherwise
    # bounce the iframe onto a path the upstream rejects → raw 405). Off-host
    # redirects are NOT followed (SSRF guard); they fall through and get rewritten.
    # Fast timeout so a dead upstream fails in seconds, not 30s.
    try:
        async with httpx.AsyncClient(verify=True, follow_redirects=False,
                                     timeout=httpx.Timeout(9.0, connect=4.0)) as client:
            upstream = await client.request(method, url, content=body, headers=headers)
            for _ in range(4):
                if upstream.status_code not in (301, 302, 303, 307, 308):
                    break
                loc = upstream.headers.get("location")
                if not loc:
                    break
                nxt = httpx.URL(str(upstream.url)).join(loc)
                if nxt.host != base_host or nxt.scheme not in ("http", "https"):
                    break  # off-host → don't follow; rewrite + return below
                if upstream.status_code in (301, 302, 303):
                    method, body = "GET", b""
                upstream = await client.request(method, str(nxt), content=body, headers=headers)
    except httpx.RequestError:
        return _error_page(app_name, base, 502, "The app could not be reached. It may be offline or still starting up.")

    # Upstream error → branded page (never relay a raw vendor 4xx/5xx body).
    if upstream.status_code >= 400:
        return _error_page(app_name, base, upstream.status_code,
                           "The app returned an error and may not support being shown in a window. You can still open it in a new tab.")

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
                except Exception:
                    pass

            async def upstream_to_client():
                try:
                    async for msg in upstream:
                        await websocket.send_text(msg if isinstance(msg, str) else msg.decode("utf-8", "replace"))
                except Exception:
                    pass

            # When EITHER direction ends (clean upstream close, client disconnect,
            # or error), cancel the other — otherwise the surviving side parks on
            # receive_text()/the async-for forever, leaking both sockets.
            tasks = [asyncio.create_task(client_to_upstream()),
                     asyncio.create_task(upstream_to_client())]
            try:
                _done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                for t in pending:
                    t.cancel()
                await asyncio.gather(*pending, return_exceptions=True)
            finally:
                try:
                    await upstream.close()
                except Exception:
                    pass
    except Exception:
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
