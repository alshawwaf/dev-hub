from db.database import SessionLocal
from db import models
from passlib.context import CryptContext
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def seed():
    db = SessionLocal()
    try:
        # Check if admin exists
        admin_email = os.getenv("SUPERADMIN_EMAIL", "admin@alshawwaf.ca")
        admin_password = os.getenv("SUPERADMIN_PASSWORD", "Cpwins!1@2026")
        
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
            
        # Seed some initial apps if none exist
        if db.query(models.Application).count() == 0:
            print("Seeding initial applications...")
            apps = [
                models.Application(
                    name="Lakera Demo",
                    description="Interactive playground for testing LLM guardrails.",
                    url="https://lakera.alshawwaf.ca",
                    github_url="https://github.com/alshawwaf/Lakera-Demo",
                    category="AI Security",
                    icon="/logos/lakera.png",
                    is_live=True
                ),
                models.Application(
                    name="Training Portal",
                    description="Enterprise blueprint for virtualized hands-on learning.",
                    url="https://training.alshawwaf.ca",
                    github_url="https://github.com/alshawwaf/training-portal",
                    category="Training",
                    icon="/logos/training.png",
                    is_live=True
                ),
                models.Application(
                    name="Docs to Swagger",
                    description="Convert API docs to OpenAPI spec.",
                    url="https://swagger.alshawwaf.ca",
                    github_url="https://github.com/alshawwaf/cp-docs-to-swagger",
                    category="Developer Tools",
                    icon="/logos/swagger.png",
                    is_live=True
                ),
                models.Application(
                    name="n8n Workflow",
                    description="Workflow automation platform for AI agents.",
                    url="https://workflow.alshawwaf.ca",
                    github_url="https://github.com/alshawwaf/cp-agentic-mcp-playground",
                    category="Automation",
                    icon="/logos/n8n.png",
                    is_live=True
                ),
                models.Application(
                    name="Open WebUI",
                    description="Chat interface for LLMs and AI models.",
                    url="https://chat.alshawwaf.ca",
                    github_url="https://github.com/alshawwaf/cp-agentic-mcp-playground",
                    category="AI Chat",
                    icon="/logos/openwebui.png",
                    is_live=True
                ),
                models.Application(
                    name="Flowise",
                    description="Visual builder for LLM flows and chains.",
                    url="https://flowise.alshawwaf.ca",
                    github_url="https://github.com/alshawwaf/cp-agentic-mcp-playground",
                    category="AI Development",
                    icon="/logos/flowise.png",
                    is_live=True
                ),
                models.Application(
                    name="Langflow",
                    description="Visual designer for LangChain pipelines.",
                    url="https://langflow.alshawwaf.ca",
                    github_url="https://github.com/alshawwaf/cp-agentic-mcp-playground",
                    category="AI Development",
                    icon="/logos/langflow.png",
                    is_live=True
                ),
                models.Application(
                    name="OpenClaw",
                    description="Personal AI assistant gateway.",
                    url="https://openclaw.alshawwaf.ca",
                    github_url="https://github.com/openclaw",
                    category="Agentic AI",
                    icon="/logos/openclaw.png",
                    is_live=True
                ),
            ]
            db.add_all(apps)
            db.commit()
            print("Initial applications seeded.")
            
    finally:
        db.close()

if __name__ == "__main__":
    seed()
