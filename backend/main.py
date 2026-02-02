from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.database import engine, Base
from routers import auth, apps

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Dev-Hub API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(apps.router, prefix="/apps", tags=["apps"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Dev-Hub API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
