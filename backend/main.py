import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import create_tables, SessionLocal
import models  # Must import models for Base.metadata to register them
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from config import UPLOAD_DIR
from routers import auth_routes, issue_routes, vote_routes, comment_routes, analytics_routes, notification_routes, authority_routes, ai_routes, admin_routes

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def auto_escalation_agent():
    while True:
        await asyncio.sleep(3600)
        try:
            db = SessionLocal()
            now = datetime.utcnow()
            cutoff = now - timedelta(hours=48)
            
            issues = db.query(models.Issue).filter(
                models.Issue.status == models.IssueStatus.verified,
                models.Issue.vote_count >= 10,
                models.Issue.updated_at < cutoff,
                models.Issue.is_escalated == False
            ).all()
            
            for issue in issues:
                if issue.severity == models.IssueSeverity.low:
                    issue.severity = models.IssueSeverity.medium
                elif issue.severity == models.IssueSeverity.medium:
                    issue.severity = models.IssueSeverity.high
                elif issue.severity == models.IssueSeverity.high:
                    issue.severity = models.IssueSeverity.critical
                
                issue.is_escalated = True
                issue.updated_at = now
                
                comment = models.Comment(
                    issue_id=issue.id,
                    user_id=None,
                    body="🚨 Auto-escalated due to high community verification and no recent activity.",
                    is_authority_update=True
                )
                db.add(comment)
            
            db.commit()
            db.close()
        except Exception as e:
            print(f"Escalation task error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    task = asyncio.create_task(auto_escalation_agent())
    yield
    task.cancel()


# Create FastAPI app
app = FastAPI(
    title="Community Hero API",
    description="Community Hero — Civic Issue Reporting Platform",
    version="1.0.0",
    lifespan=lifespan,
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



# Include all routers
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Auth"])
app.include_router(issue_routes.router, prefix="/api/issues", tags=["Issues"])
app.include_router(vote_routes.router, prefix="/api/issues", tags=["Votes"])
app.include_router(comment_routes.router, prefix="/api/issues", tags=["Comments"])
app.include_router(analytics_routes.router, prefix="/api", tags=["Analytics"])
app.include_router(notification_routes.router)
app.include_router(authority_routes.router)
app.include_router(ai_routes.router, prefix="/api/ai", tags=["AI"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["Admin"])


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "Community Hero API"}
