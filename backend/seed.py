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
                    url=f"https://workflow.{DOMAIN}",
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

        # One-time icon overhaul: give the in-house apps a glyph icon. Only
        # replaces an empty icon or the old "/logos/..." default, so any icon an
        # admin sets later (via the edit form) is never clobbered.
        bespoke_icons = {
            "Demo Server": "lucide:Server",
            "Script Builder": "lucide:Terminal",
            "SAML IDP Simulator": "lucide:KeyRound",
            "Training Portal": "lucide:GraduationCap",
            "AI Basic Training": "lucide:Sparkles",
        }
        changed = 0
        for app_name, new_icon in bespoke_icons.items():
            row = db.query(models.Application).filter(
                models.Application.name == app_name
            ).first()
            if row and (not row.icon or row.icon.startswith("/logos/")):
                row.icon = new_icon
                changed += 1
        if changed:
            db.commit()
            print(f"Icon backfill complete. Updated {changed} app icon(s).")

        # One-time embed-by-default for the apps verified to render inside a
        # window (others either block framing or render blank/404, so they keep
        # the launcher). Applied only on the first boot when every app is still
        # False, so an admin toggling embedding later is never overridden.
        embed_default = {
            "Docs to Swagger", "Open WebUI", "Flowise",
            "Training Portal", "SAML IDP Simulator",
        }
        all_apps = db.query(models.Application).all()
        if all_apps and all(not a.embeddable for a in all_apps):
            for a in all_apps:
                if a.name in embed_default:
                    a.embeddable = True
            db.commit()
            print(f"Embed-by-default applied to {sum(1 for a in all_apps if a.embeddable)} app(s).")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
