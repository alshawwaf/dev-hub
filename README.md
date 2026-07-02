# AI DevHub — a macOS-style desktop for your AI & security stack

AI DevHub is the front door to a whole ecosystem of internal AI and security tools. Instead of a plain link list, it presents them as a **macOS-style desktop**: apps live as icons on the desktop and in the dock, and each one opens in a draggable, resizable window (framed in-place) or its own tab. It's the "jump server" for the [ubuntu-dokploy-ai](https://github.com/alshawwaf/ubuntu-dokploy-ai) app stack.

![AI DevHub Desktop](https://raw.githubusercontent.com/alshawwaf/dev-hub/main/frontend/public/preview.png)

## Features

- **Desktop OS metaphor** — dock, desktop icons, and draggable/resizable app windows with real traffic-light controls. Windows remember their size, position, and maximized state per user.
- **Folders** — right-click → New Folder (inline-named, macOS-style), drag apps in, color them, and open a Launchpad-style panel.
- **Spotlight (⌘K)** — a command palette to search and launch any app from the keyboard.
- **Widgets rail** — live clock, system, activity, errors, latency, recent-activity and more; toggle and arrange per user.
- **In-window app embedding** — apps render inside a window via iframe, with a server-side reachability/framing probe that shows a clean launcher card when an app can't be framed.
- **Per-user layout** — each signed-in user's icon positions, dock/desktop placement, folders, widgets, and theme (dark / light / **auto**) follow them across devices; admins set the shared default.
- **Admin management** — add, edit, rename, delete, and place apps; snapshot the current layout as everyone's default.
- **Login-required** — a JWT-gated internal portal.

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Lucide icons, a hand-rolled CSS design system (deep-space glassmorphism).
- **Backend**: FastAPI (Python 3.11), SQLAlchemy, Pydantic.
- **Database**: PostgreSQL.
- **Serving**: nginx (serves the SPA, proxies `/api`, and reverse-proxies `/embed` for same-origin app framing).
- **Packaging**: Docker + Docker Compose.

## Getting Started

### Prerequisites

- Docker and Docker Compose.

### Run locally

```bash
git clone https://github.com/alshawwaf/dev-hub.git
cd dev-hub
docker compose up -d --build
```

- **App**: [http://localhost:3001](http://localhost:3001)
- **API docs**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

### Seed the app catalog

The backend seeds on startup; to (re)seed the default apps manually:

```bash
docker exec dev_hub_backend python seed.py
```

The seed is idempotent and reproduces the full app board, so a redeploy loses nothing (data also persists in the `dev_hub_db_data` volume).

### Deploy

In production this runs as `hub.<domain>` inside the [ubuntu-dokploy-ai](https://github.com/alshawwaf/ubuntu-dokploy-ai) stack (bare-metal Ubuntu + Dokploy + Traefik/Let's Encrypt). The in-app **Guide** (top-bar menu → Guide) walks through the full deployment.

## Configuration

Set via environment (see `docker-compose.yml`):

- `DATABASE_URL` — PostgreSQL connection string.
- `SECRET_KEY` — JWT signing key (pin it so sessions and encrypted embed URLs survive redeploys).
- `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` — the first admin, created on seed.
- `DOMAIN` — used to derive the default app URLs when seeding.

## Security

- JWT-based authentication; the desktop is login-required and admin actions are role-gated.
- App **embed URLs** that carry tokens are stored AES-256-GCM encrypted at rest and only served from an authenticated endpoint.
- nginx sets `frame-ancestors`/`X-Frame-Options` on the hub itself and never caches the SPA shell, so redeploys are picked up immediately.

## License

MIT — see the LICENSE file.
