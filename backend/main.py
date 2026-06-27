import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import create_tables
import models  # Must import models for Base.metadata to register them
from config import UPLOAD_DIR
from routers import auth_routes, issue_routes, vote_routes, comment_routes, analytics_routes, notification_routes, authority_routes

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Create FastAPI app
app = FastAPI(
    title="Community Hero API",
    description="Community Hero — Civic Issue Reporting Platform",
    version="1.0.0",
)

# CORS: allow all origins for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images statically
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Create tables on startup
@app.on_event("startup")
def on_startup():
    create_tables()

# Include all routers
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Auth"])
app.include_router(issue_routes.router, prefix="/api/issues", tags=["Issues"])
app.include_router(vote_routes.router, prefix="/api/issues", tags=["Votes"])
app.include_router(comment_routes.router, prefix="/api/issues", tags=["Comments"])
app.include_router(analytics_routes.router, prefix="/api", tags=["Analytics"])
app.include_router(notification_routes.router)
app.include_router(authority_routes.router)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "Community Hero API"}
