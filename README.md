# AI DevHub | Premium AI Developer Ecosystem

AI DevHub is a high-performance, premium dashboard designed to centralize and manage your AI application ecosystem. Featuring a modern "Glassmorphism" aesthetic and a secure backend, it provides a unified interface for developers to access their internal AI tools, agents, and infrastructure.

![AI DevHub Dashboard](https://raw.githubusercontent.com/alshawwaf/dev-hub/main/frontend/public/preview.png)

## Features

- **Premium UI/UX**: Built with a "Deep Space" dark theme, rich gradients, and interactive glassmorphism components.
- **App Catalog**: Centralized access to tools like Langflow, Flowise, n8n, Open WebUI, and more.
- **Admin Management**: Secure interface to add, update, or remove applications from the ecosystem.
- **Categorization**: Group tools into Infrastructure, AI Security, AI Agents, etc.
- **Responsive Design**: Optimized for desktops, tablets, and mobile devices.
- **Dockerized Architecture**: Simple deployment using Docker Compose.

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Lucide Icons, Vanilla CSS (Premium Glassmorphism).
- **Backend**: FastAPI (Python 3.11), SQLAlchemy, Pydantic.
- **Database**: PostgreSQL.
- **Infrastructure**: Docker, Docker Compose, Nginx (Proxy).

## Getting Started

### Prerequisites

- Docker and Docker Compose installed on your machine.

### Installation & Deployment

1. **Clone the Repository**
   ```bash
   git clone https://github.com/alshawwaf/dev-hub.git
   cd dev-hub
   ```

2. **Start the Ecosystem**
   ```bash
   docker compose up -d --build
   ```

3. **Access the Application**
   - **Frontend**: [http://localhost:3001](http://localhost:3001)
   - **API Docs**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

### Initial Setup (Seeding)

To populate the dashboard with default applications:
```bash
docker exec dev_hub_backend python seed.py
```

## Security

- JWT-based authentication for the Admin panel.
- Environment-based configuration for sensitive credentials.
- Protected routes for sensitive API operations.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---
