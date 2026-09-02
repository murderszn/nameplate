from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .db import engine, Base
from .seed import seed_database
from .routers import properties, assets, work_orders, service, users, sync, qr


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and seed initial data
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield


app = FastAPI(
    title="Nameplate Asset Infrastructure API",
    description="Offline-first backend and portfolio ledger for property management, equipment tracking, and work orders.",
    version="1.0.0",
    lifespan=lifespan,
)

# Cross-Origin Resource Sharing (CORS) for Vite localhost, Flutter Web, and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(properties.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(work_orders.router, prefix="/api")
app.include_router(service.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
app.include_router(qr.router, prefix="/api")


@app.get("/")
def root():
    return {
        "name": "Nameplate Asset Infrastructure API",
        "status": "online",
        "docsUrl": "/docs",
        "version": "1.0.0",
        "database": "SQLite 3 WAL Engine",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Nameplate Backend",
        "database": "connected",
    }
