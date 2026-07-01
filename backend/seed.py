from db.database import SessionLocal
from db import models
from migrate import init_db
from passlib.context import CryptContext
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def seed():
    # Ensure tables + new columns exist before any query (seed.py runs
    # standalone in the container CMD, before uvicorn imports main.py).
    init_db()
    db = SessionLocal()
    try:
        # Basic Configuration - use env var or default
        DOMAIN = os.getenv("DOMAIN", "ai.alshawwaf.ca")

        # Seed Superadmin
        admin_email = os.getenv("SUPERADMIN_EMAIL", f"admin@{DOMAIN}")
        admin_password = os.getenv("SUPERADMIN_PASSWORD", "ChangeThisPassword123!")

        user = db.query(models.User).filter(models.User.email == admin_email).first()
        if not user:
            print(f"Seeding superadmin user: {admin_email}")
            new_user = models.User(
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                is_admin=True
            )
            db.add(new_user)
            db.commit()
            print("Superadmin seeded successfully.")
        else:
            print("Superadmin already exists.")

        # Seed/upsert applications — adds any missing by name,
        # leaves existing rows untouched so admin edits survive redeploys.
        print("Syncing applications...")
        apps = [
                models.Application(
                    name="Lakera Guard Demo",
                    description="AI security guardrails",
                    url=f"https://lakera.{DOMAIN}",
                    github_url="https://github.com/alshawwaf/Lakera-Demo",
                    category="AI Security",
                    icon="/logos/lakera.png",
                    is_live=True
                ),
                models.Application(
                    name="Training Portal",
                    description="AI development training platform",
                    url=f"https://training.{DOMAIN}",
                    github_url="https://github.com/alshawwaf/training-portal",
                    category="Training",
                    icon="/logos/training.png",
                    is_live=True
                ),
                models.Application(
                    name="Docs to Swagger",
                    description="Convert API docs to OpenAPI",
                    url=f"https://swagger.{DOMAIN}",
                    github_url="https://github.com/alshawwaf/cp-docs-to-swagger",
                    category="Developer Tools",
                    icon="/logos/swagger.png",
                    is_live=True
                ),
                models.Application(
                    name="n8n Workflow",
                    description="AI workflow automation platform",
                    url=f"https://n8n.{DOMAIN}",
                    github_url="https://github.com/alshawwaf/cp-agentic-mcp-playground",
                    category="Automation",
                    icon="/logos/n8n.png",
                    is_live=True
                ),
                models.Application(
                    name="Open WebUI",
                    description="Chat interface for AI models",
                    url=f"https://chat.{DOMAIN}",
                    github_url="https://github.com/alshawwaf/cp-agentic-mcp-playground",
                    category="AI Chat",
                    icon="/logos/openwebui.png",
                    is_live=True
                ),
                models.Application(
                    name="Flowise",
                    description="Visual LLM flow builder",
                    url=f"https://flowise.{DOMAIN}",
                    github_url="https://github.com/alshawwaf/cp-agentic-mcp-playground",
                    category="AI Development",
                    icon="/logos/flowise.png",
                    is_live=True
                ),
                models.Application(
                    name="Langflow",
                    description="Visual AI pipeline designer",
                    url=f"https://langflow.{DOMAIN}",
                    github_url="https://github.com/alshawwaf/cp-agentic-mcp-playground",
                    category="AI Development",
                    icon="/logos/langflow.png",
                    is_live=True
                ),
                models.Application(
                    name="OpenClaw",
                    description="Personal AI assistant gateway",
                    url=f"https://claw.{DOMAIN}",
                    github_url="https://github.com/openclaw",
                    category="Agentic AI",
                    icon="/logos/openclaw.png",
                    is_live=True
                ),
                models.Application(
                    name="AI Basic Training",
                    description="AI/ML learning curriculum: Classic ML, Neural Networks, Generative AI",
                    url=f"https://learn.{DOMAIN}",
                    github_url="https://github.com/alshawwaf/ai-basic-training",
                    category="Training",
                    icon="/logos/ai-basic-training.png",
                    is_live=True
                ),
                models.Application(
                    name="Drawbridge",
                    description="Integration server — connectors & simulators for lab integrations",
                    url=f"https://dcsim.{DOMAIN}",
                    github_url="https://github.com/alshawwaf/Drawbridge",
                    category="Integration",
                    icon="lucide:Cable",
                    is_live=True
                ),
        ]
        added = 0
        for app in apps:
            existing = db.query(models.Application).filter(
                models.Application.name == app.name
            ).first()
            if not existing:
                db.add(app)
                added += 1
        db.commit()
        print(f"Application sync complete. Added {added} new app(s).")

        # Default glyph for in-house apps. Fills ONLY an empty icon, so any icon an
        # admin sets later (including a /logos/… path) is never reverted on redeploy.
        # (Previously this also overwrote any "/logos/…" value, which silently undid
        # admin icon edits every deploy.)
        bespoke_icons = {
            "Demo Server": "lucide:Server",
            "Script Builder": "lucide:Terminal",
            "SAML IDP Simulator": "lucide:KeyRound",
            "Training Portal": "lucide:GraduationCap",
            "AI Basic Training": "lucide:Sparkles",
            "Lakera Guard Demo": "lucide:ShieldCheck",
        }
        changed = 0
        for app_name, new_icon in bespoke_icons.items():
            row = db.query(models.Application).filter(
                models.Application.name == app_name
            ).first()
            if row and not row.icon:
                row.icon = new_icon
                changed += 1
        if changed:
            db.commit()
            print(f"Icon backfill complete. Updated {changed} app icon(s).")

        # Run every app inside a window. Each app gets its recommended method:
        # framable apps (and root-only SPAs / token dashboards) render the real URL
        # directly; the same-origin proxy is reserved for simple apps that block
        # framing but tolerate a path prefix. Only apps NOT yet configured for
        # embedding are touched here, so admin toggles stand.
        # Every app frames its REAL URL directly. The same-origin path-prefix proxy
        # is retired: it can't survive login redirects / SPA routing / non-GET methods
        # (it surfaced raw "405 Not Allowed" from the upstream nginx). Direct embed +
        # an edge frame-ancestors allowance (a Traefik hubframe middleware on each
        # app's route, or one default middleware on the entrypoint) is the reliable
        # path for ALL apps.
        embed_direct = {
            "Docs to Swagger", "Open WebUI", "Flowise",
            "Training Portal", "SAML IDP Simulator", "Lakera Guard Demo",
            "n8n Workflow", "Langflow", "OpenClaw",
            "AI Basic Training", "Demo Server", "Script Builder", "Drawbridge",
        }
        embed_proxy = set()  # retired — see note above
        changed_embed = 0
        for a in db.query(models.Application).all():
            if a.embeddable or a.proxy_embed:
                continue  # already set up to embed — don't override
            if a.name in embed_direct:
                a.embeddable = True
                changed_embed += 1
            elif a.name in embed_proxy:
                a.proxy_embed = True
                changed_embed += 1
        if changed_embed:
            db.commit()
            print(f"Embed config applied to {changed_embed} app(s).")

        # Correction for earlier installs that routed these through the proxy:
        # n8n / Langflow are root-only SPAs and OpenClaw is a token-gated dashboard,
        # none of which the path-prefix proxy can serve. Force them to direct embed
        # even if a prior deploy set proxy_embed.
        force_direct = {"n8n Workflow", "Langflow", "OpenClaw"}
        fixed = 0
        for a in db.query(models.Application).all():
            if a.name in force_direct and (not a.embeddable or a.proxy_embed):
                a.embeddable = True
                a.proxy_embed = False
                fixed += 1
        if fixed:
            db.commit()
            print(f"Direct-embed correction applied to {fixed} app(s).")

        # URL correction: n8n's editor is served at n8n.<domain> (N8N_HOST /
        # N8N_EDITOR_BASE_URL), not workflow.<domain>. Fix the managed row only if it
        # still holds the old seeded default, so any admin-set URL is preserved.
        url_fixes = {"n8n Workflow": (f"https://workflow.{DOMAIN}", f"https://n8n.{DOMAIN}")}
        url_fixed = 0
        for name, (old_url, new_url) in url_fixes.items():
            row = db.query(models.Application).filter(models.Application.name == name).first()
            if row and row.url == old_url:
                row.url = new_url
                url_fixed += 1
        if url_fixed:
            db.commit()
            print(f"URL correction applied to {url_fixed} app(s).")

        # Retire the path-prefix proxy for EVERY app (incl. ones renamed by an admin,
        # e.g. "Demo Server" -> "Threat Prevention Server"): flip any proxy_embed row
        # to direct embed. The proxy 405s on login/SPA flows; direct embed lets the
        # probe show a clean status and, with an edge frame-ancestors allowance, the
        # app renders in-window.
        proxy_retired = 0
        for a in db.query(models.Application).all():
            if a.proxy_embed:
                a.proxy_embed = False
                a.embeddable = True
                proxy_retired += 1
        if proxy_retired:
            db.commit()
            print(f"Retired proxy embedding for {proxy_retired} app(s) -> direct.")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
