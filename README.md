# Dev Hub

A macOS-desktop-style portal that ties the Check Point demo, training and AI/security suite together — each app opens in a draggable, resizable window on a shared desktop.

Dev Hub is the front door to the ecosystem. Deploy the whole suite with a single command via [ubuntu-dokploy-ai](https://github.com/alshawwaf/ubuntu-dokploy-ai).

## Overview

Instead of a plain link list, Dev Hub presents the suite as a **desktop OS**: apps live as icons on the desktop and in the dock, and each one opens framed in-place in its own window. It's the "jump server" for the [ubuntu-dokploy-ai](https://github.com/alshawwaf/ubuntu-dokploy-ai) stack — a login-gated internal portal where the catalog, layout, and app lifecycle are all managed from one place.

The React SPA is served by nginx, which reverse-proxies `/api` and `/embed` to a FastAPI backend, so the whole thing runs same-origin behind one hostname (`hub.<domain>`).

## The suite

Every app is reachable at `<subdomain>.<domain>` behind the same Traefik + Cloudflare Tunnel / Let's Encrypt edge. Dev Hub embeds each one in a window.

| App | What it does | Subdomain | Repo |
| --- | --- | --- | --- |
| **Dev Hub** | macOS-style desktop portal / launcher for the whole suite (this repo) | `hub` | [dev-hub](https://github.com/alshawwaf/dev-hub) |
| **AI Guardrails Playground** | Test LLM prompt-injection / jailbreak guardrails across providers (Azure OpenAI, OpenAI, Anthropic, Gemini, Ollama) | `guardrails` | [ai-guardrails-demo](https://github.com/alshawwaf/ai-guardrails-demo) |
| **CP Agentic MCP Playground** | Build AI agents (n8n, Flowise, Langflow, Open WebUI) over Check Point MCP servers, with Langfuse tracing | `n8n` · `chat` · `flowise` · `langflow` · `trace` | [cp-agentic-mcp-playground](https://github.com/alshawwaf/cp-agentic-mcp-playground) |
| **PolicyPilot** | Turn plain-language / ticket requests into safe Check Point access-policy changes | `policypilot` | [PolicyPilot](https://github.com/alshawwaf/PolicyPilot) |
| **Drawbridge** | Datacenter Simulator serving Check Point / CloudGuard-format datacenter feeds for PoV demos | `dcsim` | [Drawbridge](https://github.com/alshawwaf/Drawbridge) |
| **Threat Prevention Server** | Check Point threat-prevention demo / data server | `threat` | [cp_demo_server](https://github.com/alshawwaf/cp_demo_server) |
| **Training Portal** | Hands-on lab portal (Apache Guacamole remote access) | `training` | [training-portal](https://github.com/alshawwaf/training-portal) |
| **AI Basic Training** | Introductory AI / security training portal | `learn` | [ai-basic-training](https://github.com/alshawwaf/ai-basic-training) |
| **Docs to Swagger** | Convert Check Point API documentation into browsable OpenAPI / Swagger | `swagger` | [cp-docs-to-swagger](https://github.com/alshawwaf/cp-docs-to-swagger) |
| **Identity Provider (IdP)** | SAML / SCIM Identity Provider simulator for SSO demos | `idp` | [SAML_IDP_Simulator](https://github.com/alshawwaf/SAML_IDP_Simulator) |
| **OpenClaw** | Agentic browser (third-party), embedded in the hub | `claw` | third-party |
| **Script Builder** | Check Point deployment-script builder | `scriptbuilder` | `cp-script-builder` (private) |

> The CP Agentic MCP Playground surfaces as several windows on the board (n8n, Open WebUI, Flowise, Langflow, and the Langfuse trace UI), all from the one repo.

## Features

- **Desktop OS metaphor** — dock, desktop icons, and draggable/resizable app windows with real traffic-light controls. Windows remember their size, position, and maximized state per user.
- **Folders** — right-click → New Folder (inline-named, macOS-style), drag apps in, color them, and open a Launchpad-style folder view.
- **Spotlight (⌘K)** — a command palette to search and launch any app from the keyboard.
- **Widgets rail** — live cards for System (host uptime / load / memory / disk), App health, API activity (sparkline), Errors today, and Recent activity; toggle and arrange per user.
- **In-window app embedding** — apps render inside a window via iframe. A server-side reachability + framing **probe** shows a clean "offline / not deployed / can't be framed" launcher card instead of a raw cross-origin error. A same-origin `/embed` reverse proxy is available for apps that block framing but tolerate a path prefix (direct embed + an edge `frame-ancestors` allowance is the default path).
- **Per-user layout** — each signed-in user's icon positions, dock/desktop placement, folders, widgets, icon colors, and theme (dark / light / **auto**) follow them across devices; the admin sets the shared default.
- **Admin management** — add, edit, rename, delete, and place apps from an in-window Application Settings panel; snapshot the current layout as everyone's default.
- **App lifecycle** — map an app to its Dokploy service and start / stop / restart / redeploy it from the hub (the hub refuses to power itself off).
- **API keys** — mint scoped `devhub_…` bearer keys (read / write / admin) for scripts and agents; only a SHA-256 hash is stored and the raw key is shown once.
- **MCP endpoint** — an MCP server at `/api/mcp` lets an LLM agent drive the hub (see [MCP server & agents](#mcp-server--agents)).
- **Activity log & notifications** — every request is captured (with sensitive values redacted) and admin actions raise a notification in the menu-bar bell.
- **Themed API docs** — a branded Swagger UI at `/api/docs` with an Authorize button that accepts a JWT or a `devhub_` API key.

## Screenshots

_Placeholder — add desktop / window / folder screenshots here._

## Quick start

Prerequisites: Docker and Docker Compose.

```bash
git clone https://github.com/alshawwaf/dev-hub.git
cd dev-hub
docker compose up -d --build
```

This builds Postgres, the FastAPI backend, and the nginx-served frontend. The backend auto-applies migrations and seeds the app catalog + superadmin on startup.

The frontend container listens on port 80 internally, but the compose file **publishes no host port by design** (in production Traefik routes to it). To browse it locally, publish a port on the `dev-hub-frontend` service:

```yaml
    ports:
      - "3001:80"
```

then re-run `docker compose up -d` and open:

- **App**: http://localhost:3001
- **API docs**: http://localhost:3001/api/docs

The default superadmin is `admin@ai.alshawwaf.ca` / `ChangeThisPassword123!` (override via env — see [Configuration](#configuration)).

### Re-seed the catalog

The backend seeds on startup and is idempotent, so a redeploy loses nothing (data also persists in the `dev_hub_db_data` volume). To re-run the seed by hand:

```bash
docker exec dev_hub_backend python seed.py
```

## Deployment

In production Dev Hub runs as `hub.<domain>` inside the [ubuntu-dokploy-ai](https://github.com/alshawwaf/ubuntu-dokploy-ai) stack (bare-metal Ubuntu + Docker + Dokploy + Traefik, with a Cloudflare Tunnel or Let's Encrypt).

Dokploy builds `./backend` and `./frontend` from source using `docker-compose.dokploy.yml` and injects a rendered `.env`. There is no bundled reverse proxy or host port publishing there — Dokploy wires Traefik to the frontend service, and the frontend's nginx (`frontend/nginx.conf`) reverse-proxies `/api` and `/embed` to the backend so the app is served same-origin. The installer-supplied `.env` keys are `DOMAIN`, `DEV_HUB_DB_PASSWORD`, `DEV_HUB_SECRET_KEY`, `DEV_HUB_SUPERADMIN_PASSWORD`, `DEVHUB_MCP_TOKEN` (and optional `SUPERADMIN_EMAIL`).

The in-app **Guide** (top-bar menu → Guide) walks through the full deployment.

## Configuration

Environment variables read by the backend:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | SQLAlchemy connection string. Defaults to SQLite at `/app/data/dev_hub.db`; the compose files set Postgres. |
| `SECRET_KEY` | JWT signing key **and** the source of the AES-256-GCM key (its SHA-256) used to encrypt embed URLs and hub settings at rest. Pin it so sessions and encrypted values survive redeploys. |
| `DOMAIN` | Base domain used to derive the default app URLs (`<subdomain>.<domain>`) when seeding. |
| `SUPERADMIN_EMAIL` | Email of the first admin, created on seed (defaults to `admin@<DOMAIN>`). |
| `SUPERADMIN_PASSWORD` | Password for the seeded admin. |
| `DEVHUB_MCP_TOKEN` | Optional. When set, seed provisions an active read+write API key whose secret is this token, so `/api/mcp` accepts `Bearer <token>` on a fresh deploy without minting a key by hand. Empty = no-op. |

The Dokploy control-plane URL + API token are **not** environment variables — an admin sets them in-app (encrypted at rest as `HubSetting` rows), and the token is never returned by any endpoint.

## MCP server & agents

Dev Hub exposes an MCP server (Streamable HTTP, JSON-RPC 2.0) at `POST /api/mcp` so an LLM agent can drive the hub programmatically. Tools are thin wrappers over the same functions the REST endpoints use:

- **Read** (any valid credential): `list_apps`, `get_app`, `probe_app`, `app_status`.
- **Admin** (admin JWT session or admin-scoped key): `create_app`, `update_app`, `delete_app`, `power_action`.

Authenticate with `Authorization: Bearer <devhub_ API key>` (or a JWT). A ready-to-import n8n workflow ships at [`docs/devhub-agent.json`](docs/devhub-agent.json); it authenticates with the `DEVHUB_MCP_TOKEN` set in the deploy environment, so the agent works on a fresh deploy without a human minting a key first.

## Tech stack

- **Frontend**: React 19, Vite, TypeScript, `react-router-dom` 7, `lucide-react` icons, axios; a hand-rolled CSS design system (deep-space glassmorphism).
- **Backend**: FastAPI (Python 3.11), SQLAlchemy, Pydantic; `python-jose` (JWT), `passlib`/`bcrypt`, `httpx`, `websockets`, and `cryptography` (AES-256-GCM).
- **Database**: PostgreSQL in production (SQLite fallback for local/dev).
- **Serving**: nginx serves the SPA and reverse-proxies `/api` and `/embed` to the backend (uvicorn, single worker — the DB pool and sync threadpool are sized per process).
- **Packaging**: Docker + Docker Compose; deployed via Dokploy / Traefik.

## Development

- **Frontend**: `cd frontend && npm install && npm run dev` (Vite dev server). `npm run build` type-checks and builds; `npm run lint` runs ESLint.
- **Backend**: a standard FastAPI app under `backend/` — `pip install -r requirements.txt` then `uvicorn main:app --reload` (set `DATABASE_URL`, or let it fall back to SQLite). `init_db()` applies lightweight column migrations and `seed.py` seeds the catalog.

## Security

- **Login-required** JWT authentication; the desktop is gated and admin actions are role-checked. `devhub_` API keys carry `read`/`write`/`admin` scopes enforced centrally (a read-only key can never mutate anything).
- App **embed URLs** (which can carry tokens) and hub **settings** (e.g. the Dokploy token) are stored **AES-256-GCM encrypted at rest** and only served from authenticated endpoints.
- The `/embed` proxy and the reachability probe **only ever hit admin-registered app URLs** (never user input), always verify upstream TLS, and never follow off-host redirects (no open-proxy / SSRF surface).
- nginx sets `frame-ancestors` / `X-Frame-Options` on the hub itself and never caches the SPA shell, so redeploys are picked up immediately.
- Request activity is logged with sensitive query values and headers redacted.
