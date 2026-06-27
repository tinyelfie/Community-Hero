from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from math import radians, sin, cos, sqrt, atan2
from datetime import datetime
import httpx
from database import get_db
import models, schemas, auth
from services import storage, ai_service

router = APIRouter()


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    """Calculate distance in km between two lat/lng points."""
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


async def reverse_geocode(lat: float, lng: float) -> str:
    """Use Nominatim Geocoding API to get a human-readable address."""
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json"
        headers = {"User-Agent": "CommunityHero/1.0"}
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(url, headers=headers)
            data = resp.json()
        if data.get("display_name"):
            return data["display_name"]
    except Exception:
        pass
    return f"{lat:.4f}, {lng:.4f}"


def enrich_issue_with_ai(issue_id: str, image_path: str, db_url: str):
    """Background task: run Gemini AI on image and update issue record."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(db_url)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        import uuid
        try:
            issue_uuid = uuid.UUID(issue_id)
        except ValueError:
            return
            
        issue = db.query(models.Issue).filter(models.Issue.id == issue_uuid).first()
        if not issue:
            return
        result = ai_service.analyze_issue_image(image_path)
        issue.ai_summary = result.get("summary", "")
        issue.ai_tags = ", ".join(result.get("tags", []))
        category_val = result.get("category", "other")
        severity_val = result.get("severity", "low")
        try:
            issue.category = models.IssueCategory(category_val)
        except ValueError:
            pass
        try:
            issue.severity = models.IssueSeverity(severity_val)
        except ValueError:
            pass
        issue.updated_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        print(f"AI enrichment error: {e}")
    finally:
        db.close()


@router.get("", response_model=List[schemas.IssueOut])
async def list_issues(
    category: Optional[str] = None,
    status: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: float = 50,
    sort: str = "votes",
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """List issues with optional filtering by category, status, location radius."""
    query = db.query(models.Issue)

    if category:
        try:
            cat = models.IssueCategory(category)
            query = query.filter(models.Issue.category == cat)
        except ValueError:
            pass

    if status:
        try:
            st = models.IssueStatus(status)
            query = query.filter(models.Issue.status == st)
        except ValueError:
            pass

    if sort == "votes":
        query = query.order_by(models.Issue.vote_count.desc())
    else:
        query = query.order_by(models.Issue.created_at.desc())

    issues = query.offset(offset).limit(limit).all()

    # Filter by radius if lat/lng provided
    if lat is not None and lng is not None:
        issues = [i for i in issues if haversine_km(lat, lng, i.latitude, i.longitude) <= radius_km]

    return [schemas.IssueOut.model_validate(i) for i in issues]


@router.post("", response_model=schemas.IssueOut, status_code=201)
async def create_issue(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    latitude: float = Form(...),
    longitude: float = Form(...),
    category: Optional[str] = Form("other"),
    severity: Optional[str] = Form("low"),
    image: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new civic issue report with optional image. Triggers AI enrichment in background."""
    # Save image
    image_url = None
    image_path = None
    if image and image.filename:
        image_url, image_path = await storage.save_upload(image)

    # Reverse geocode
    address = await reverse_geocode(latitude, longitude)

    # Validate enums
    try:
        cat = models.IssueCategory(category)
    except ValueError:
        cat = models.IssueCategory.other
    try:
        sev = models.IssueSeverity(severity)
    except ValueError:
        sev = models.IssueSeverity.low

    # Create issue
    issue = models.Issue(
        title=title,
        description=description,
        latitude=latitude,
        longitude=longitude,
        address=address,
        image_url=image_url,
        category=cat,
        severity=sev,
        status=models.IssueStatus.open,
        reported_by=current_user.id,
    )
    db.add(issue)

    # Award +10 points to reporter
    current_user.points += 10

    db.commit()
    db.refresh(issue)
    
    # Auto-subscribe reporter
    from models import Subscription
    sub = Subscription(user_id=current_user.id, issue_id=issue.id)
    db.add(sub)
    db.commit()

    # Background AI enrichment
    if image_path:
        from config import DATABASE_URL
        background_tasks.add_task(enrich_issue_with_ai, str(issue.id), image_path, DATABASE_URL)

    return schemas.IssueOut.model_validate(issue)


@router.post("/ai-preview", response_model=dict)
async def ai_preview(
    image: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Analyze an uploaded image with Gemini and return classification without creating an issue."""
    _, image_path = await storage.save_upload(image, temp=True)
    result = ai_service.analyze_issue_image(image_path)
    # Clean up temp file
    try:
        import os
        os.remove(image_path)
    except Exception:
        pass
    return result


@router.get("/{issue_id}", response_model=schemas.IssueDetail)
def get_issue(issue_id: str, db: Session = Depends(get_db)):
    """Get full issue details including comments."""
    import uuid
    try:
        issue_uuid = uuid.UUID(issue_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    issue = db.query(models.Issue).filter(models.Issue.id == issue_uuid).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return schemas.IssueDetail.model_validate(issue)


@router.patch("/{issue_id}/status", response_model=schemas.IssueOut)
def update_status(
    issue_id: str,
    body: schemas.IssueStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Update issue status. Requires moderator or admin role."""
    if current_user.role.value not in ("moderator", "admin"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    import uuid
    try:
        issue_uuid = uuid.UUID(issue_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    issue = db.query(models.Issue).filter(models.Issue.id == issue_uuid).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    old_status = issue.status
    issue.status = body.status
    issue.updated_at = datetime.utcnow()
    
    if old_status != body.status:
        # Create notifications for subscribers
        from models import Subscription, Notification
        subs = db.query(Subscription).filter(Subscription.issue_id == issue.id).all()
        for sub in subs:
            msg = f"Issue '{issue.title}' status updated to {body.status.value.replace('_', ' ')}."
            notif = Notification(user_id=sub.user_id, issue_id=issue.id, message=msg)
            db.add(notif)
            # Simulate Email
            print(f"[EMAIL SIMULATION] To User {sub.user_id}: {msg}")
            
    db.commit()
    db.refresh(issue)
    return schemas.IssueOut.model_validate(issue)
