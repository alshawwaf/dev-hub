"""Self-contained Swagger UI page for GET /docs, themed for the hub.

Why custom: nginx proxies /api/ -> backend with the prefix stripped, so the
stock FastAPI docs page fetched /openapi.json at SITE root and got the SPA's
index.html ("Parser error … no valid version field"). This page loads the spec
via a RELATIVE url ("openapi.json"), which resolves to /api/openapi.json through
the proxy and still works when hitting the backend directly.

Theming: ?theme=dark|light wins; with no param the page follows
prefers-color-scheme. Dark mode uses the classic inversion technique — invert
the swagger container, re-invert real imagery — plus a DevHub-branded topbar
(pink→purple gradient) instead of swagger's own. Assets come from the same CDN
family FastAPI's defaults use (swagger-ui-dist on cdn.jsdelivr.net), pinned to an
exact version with Subresource Integrity hashes so a CDN compromise can't inject
script into an authorized (persistAuthorization) docs session.
"""

_PAGE = """<!DOCTYPE html>
<html lang="en"{theme_attr}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dev-Hub API — Docs</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.29.5/swagger-ui.css"
      integrity="sha384-++DMKo1369T5pxDNqojF1F91bYxYiT1N7b1M15a7oCzEodfljztKlApQoH6eQSKI"
      crossorigin="anonymous">
<style>
  :root {{
    --dh-pink: #ec4899;
    --dh-purple: #7c3aed;
    --dh-bg-light: #f6f7fb;
    --dh-bg-dark: #0e0e13;
  }}
  html, body {{ margin: 0; padding: 0; }}
  body {{ background: var(--dh-bg-light); }}

  /* ---- DevHub topbar (swagger's own is hidden below) ---- */
  .dh-topbar {{
    display: flex; align-items: center; gap: 12px;
    padding: 14px 22px;
    background: #ffffff;
    border-bottom: 1px solid rgba(0,0,0,.08);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }}
  .dh-mark {{
    width: 26px; height: 26px; border-radius: 8px; flex: 0 0 auto;
    background: linear-gradient(135deg, var(--dh-pink), var(--dh-purple));
  }}
  .dh-title {{ font-size: 16px; font-weight: 700; color: #17171c; letter-spacing: .01em; }}
  .dh-title .grad {{
    background: linear-gradient(90deg, var(--dh-pink), var(--dh-purple));
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }}
  .dh-sub {{ font-size: 12px; color: #6b6b76; margin-left: auto; }}
  .dh-accent {{ height: 2px; background: linear-gradient(90deg, var(--dh-pink), var(--dh-purple)); }}

  .swagger-ui .topbar {{ display: none; }}          /* replaced by .dh-topbar */
  #swagger-ui {{ max-width: 1240px; margin: 0 auto; }}

  /* ---- Dark theme: invert the swagger container, re-invert real imagery so
         photos/logos keep their true colors. Page chrome is themed directly. ---- */
  html[data-theme="dark"] body {{ background: var(--dh-bg-dark); }}
  html[data-theme="dark"] #swagger-ui {{
    filter: invert(88%) hue-rotate(180deg);
  }}
  html[data-theme="dark"] #swagger-ui img,
  html[data-theme="dark"] #swagger-ui video {{
    filter: invert(100%) hue-rotate(180deg);
  }}
  html[data-theme="dark"] .dh-topbar {{
    background: #16161d;
    border-bottom-color: rgba(255,255,255,.08);
  }}
  html[data-theme="dark"] .dh-title {{ color: #f2f2f6; }}
  html[data-theme="dark"] .dh-sub {{ color: #9a9aa6; }}
</style>
</head>
<body>
<div class="dh-topbar">
  <div class="dh-mark"></div>
  <div class="dh-title">Dev-Hub <span class="grad">API</span></div>
  <div class="dh-sub">Authorize with a JWT from /auth/login or a devhub_ API key</div>
</div>
<div class="dh-accent"></div>
<div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.29.5/swagger-ui-bundle.js"
        integrity="sha384-+//OXWv2MI+XGzCNZ1tyxL1lT/whLV95IujjmbHXUgGh80zv+9B0ii6pDIO3URWN"
        crossorigin="anonymous"></script>
<script>
  // Theme: ?theme=dark|light wins; otherwise follow the OS. Applied before the
  // UI renders so there's no flash of the wrong palette.
  (function () {{
    var qs = new URLSearchParams(window.location.search).get('theme');
    var theme = (qs === 'dark' || qs === 'light') ? qs
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }})();

  window.ui = SwaggerUIBundle({{
    url: 'openapi.json',   // RELATIVE — resolves under /api/ via the proxy, and directly against the backend too
    dom_id: '#swagger-ui',
    presets: [SwaggerUIBundle.presets.apis],
    layout: 'BaseLayout',
    deepLinking: true,
    persistAuthorization: true,
  }});
</script>
</body>
</html>
"""


def render_docs_page(theme=None) -> str:
    """The docs HTML. A valid ?theme= is baked into the initial <html> attribute
    (the inline script re-derives it anyway, so no-param still auto-detects)."""
    attr = f' data-theme="{theme}"' if theme in ("dark", "light") else ""
    return _PAGE.format(theme_attr=attr)
