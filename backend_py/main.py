import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, SessionLocal, engine
from .routers import assets, properties, qr, service, sync, users, work_orders
from .seed_data import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if not exist
    Base.metadata.create_all(bind=engine)
    # Seed database
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Nameplate REST API",
    description="Backend API and offline sync engine for Nameplate asset intelligence platform.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for local Vite / Flutter / Mobile dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers with /api prefix
app.include_router(properties.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(work_orders.router, prefix="/api")
app.include_router(service.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
app.include_router(qr.router, prefix="/api")

# Also include /v1 prefix for users compatibility if needed
app.include_router(users.router, prefix="/v1")


@app.get("/")
def root():
    return {
        "service": "Nameplate REST API",
        "status": "online",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/api/health")
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": "2026-09-02T12:00:00Z",
        "database": "connected",
    }


@app.get("/api/org")
def get_default_org():
    return {
        "id": "org_sonoran",
        "name": "Sonoran Portfolio Partners LLC",
        "slug": "sonoran-partners",
        "plan": "Enterprise Portfolio Tier",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend_py.main:app", host="0.0.0.0", port=8000, reload=True)
