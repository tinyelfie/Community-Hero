from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List, Any
from math import radians, sin, cos, sqrt, atan2
from datetime import datetime
import httpx
from database import get_db
from database import get_db
import models, schemas, auth
from services import storage, ai_service, sentiment_analyzer

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
        headers = {"User-Agent": "Nagrik/1.0"}
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(url, headers=headers)
            data = resp.json()
        if data.get("display_name"):
            return data["display_name"]
    except Exception:
        pass
    return f"{lat:.4f}, {lng:.4f}"


def enrich_issue_with_ai(issue_id: str, image_path: str, db_url: str, issue_data: dict, model, feature_names):
    """Background task: run Gemini AI on image and update issue record."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from services import ai_service, severity_predictor
    import models

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        import uuid
        issue = db.query(models.Issue).filter(models.Issue.id == uuid.UUID(issue_id)).first()
        if not issue:
            return

        gemini_result = None
        if image_path:
            gemini_result = ai_service.analyze_issue_image(image_path)
            
        # RF Prediction
        rf_result = severity_predictor.predict_severity(issue_data, db, model, feature_names)
        
        # Determine final severity
        gemini_sev = gemini_result.get("severity") if gemini_result else None
        rf_sev = rf_result.get("predicted_severity")
        rf_conf = rf_result.get("confidence", 0.0)
        
        sev_levels = {"low": 0, "medium": 1, "high": 2, "critical": 3}
        
        if gemini_sev and rf_sev:
            g_idx = sev_levels.get(gemini_sev, 0)
            r_idx = sev_levels.get(rf_sev, 0)
            diff = abs(g_idx - r_idx)
            
            if diff == 0:
                final_sev = gemini_sev
                method = "consensus"
                conf = (0.9 + rf_conf) / 2
            elif diff == 1:
                final_sev = gemini_sev
                method = "gemini_primary"
                conf = 0.9 * 0.85 # lower by 15%
            else:
                final_sev = gemini_sev
                method = "disagreement_flagged"
                issue.needs_review = True
                conf = 0.9 * 0.5
        elif rf_sev:
            final_sev = rf_sev
            method = "random_forest"
            conf = rf_conf
        elif gemini_sev:
            final_sev = gemini_sev
            method = "gemini"
            conf = 0.9
        else:
            final_sev = "medium"
            method = "default"
            conf = 0.0
            
        try:
            issue.severity = models.IssueSeverity(final_sev)
        except ValueError:
            pass
            
        issue.rf_prediction = rf_sev
        issue.gemini_prediction = gemini_sev
        issue.prediction_method = method
        issue.rf_confidence = conf
        
        if gemini_result:
            issue.category = gemini_result.get("category", issue.category)
            issue.ai_summary = gemini_result.get("summary")
            issue.ai_tags = ",".join(gemini_result.get("tags", []))
            
        db.commit()
    except Exception as e:
        print(f"Background AI task error: {e}")
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
        query = query.filter(models.Issue.category == category)

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


@router.post("", response_model=Any, status_code=201)
async def create_issue(
    request: Request,
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    latitude: float = Form(...),
    longitude: float = Form(...),
    category: Optional[str] = Form("other"),
    severity: Optional[str] = Form("low"),
    image: Optional[UploadFile] = File(None),
    image2: Optional[UploadFile] = File(None),
    image3: Optional[UploadFile] = File(None),
    force_submit: bool = Form(False),
    duplicate_issue_id: Optional[str] = Form(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new civic issue report with optional images."""
    urls = []
    first_filepath = None
    
    if image and image.filename:
        url, fp = await storage.save_upload(image)
        urls.append(url)
        first_filepath = fp
    
    if image2 and image2.filename:
        url2, _ = await storage.save_upload(image2)
        urls.append(url2)
        
    if image3 and image3.filename:
        url3, _ = await storage.save_upload(image3)
        urls.append(url3)
        
    image_url = ",".join(urls) if urls else None

    # Reverse geocode
    address = await reverse_geocode(latitude, longitude)

    # Validate enums
    cat = category if category else "other"
    try:
        sev = models.IssueSeverity(severity)
    except ValueError:
        sev = models.IssueSeverity.low

    # VADER Sentiment analysis
    compound_score, urgency = sentiment_analyzer.get_sentiment_data(description or title)

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
        description_sentiment=compound_score,
        urgency_level=urgency
    )
    db.add(issue)

    # If force submit on a duplicate, bump existing issue votes
    if force_submit and duplicate_issue_id:
        import uuid
        try:
            dup_uuid = uuid.UUID(duplicate_issue_id)
            exist_issue = db.query(models.Issue).filter(models.Issue.id == dup_uuid).first()
            if exist_issue:
                exist_issue.vote_count += 1
        except Exception:
            pass

    # Award +10 points to reporter
    current_user.points += 10

    db.commit()
    db.refresh(issue)
    
    # Auto-subscribe reporter
    from models import Subscription
    sub = Subscription(user_id=current_user.id, issue_id=issue.id)
    db.add(sub)
    db.commit()
    
    # Trigger background AI task
    issue_data = {
        "category": cat,
        "vote_count": issue.vote_count,
        "created_at": issue.created_at,
        "description": issue.description,
        "address": issue.address
    }
    
    model = request.app.state.severity_model if hasattr(request.app.state, 'severity_model') else None
    feature_names = request.app.state.feature_names if hasattr(request.app.state, 'feature_names') else None
    
    import os
    db_url = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    
    background_tasks.add_task(
        enrich_issue_with_ai, 
        str(issue.id), 
        first_filepath, 
        db_url,
        issue_data,
        model,
        feature_names
    )

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


@router.post("/draft-description", response_model=dict)
def draft_description(
    body: schemas.DraftDescriptionRequest,
    current_user: models.User = Depends(auth.get_current_user)
):
    """Generate a one-line description for an issue report using AI."""
    desc = ai_service.draft_description(body.title, body.category, body.severity)
    return {"description": desc}



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
async def update_status(
    issue_id: str,
    status: str = Form(...),
    resolution_image: UploadFile = File(None),
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

    try:
        new_status = models.IssueStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")

    old_status = issue.status
    issue.status = new_status
    issue.updated_at = datetime.utcnow()
    
    if new_status == models.IssueStatus.resolved and resolution_image and resolution_image.filename:
        image_url, _ = await storage.save_upload(resolution_image)
        issue.resolution_image_url = image_url
    
    if old_status != new_status:
        issue.status_changed_at = datetime.utcnow()
        # Create notifications for subscribers
        from models import Subscription, Notification
        subs = db.query(Subscription).filter(Subscription.issue_id == issue.id).all()
        for sub in subs:
            msg = f"Issue '{issue.title}' status updated to {new_status.value.replace('_', ' ')}."
            notif = Notification(user_id=sub.user_id, issue_id=issue.id, message=msg)
            db.add(notif)
            # Simulate Email
            print(f"[EMAIL SIMULATION] To User {sub.user_id}: {msg}")
            
        # Re-check reporter's verified status if issue is resolved
        if new_status == models.IssueStatus.resolved:
            reporter = issue.reporter
            if reporter and not reporter.is_verified_reporter:
                resolved_count = db.query(models.Issue).filter(
                    models.Issue.reported_by == reporter.id,
                    models.Issue.status == models.IssueStatus.resolved
                ).count()
                if resolved_count >= 3:
                    reporter.is_verified_reporter = True
            
    db.commit()
    db.refresh(issue)
    return schemas.IssueOut.model_validate(issue)


@router.get("/{issue_id}/resolution-suggestion", response_model=dict)
def get_resolution_suggestion(
    issue_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Get AI suggested resolution based on similar past issues."""
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
        
    if issue.ai_resolution_suggestion:
        return {"suggestion": issue.ai_resolution_suggestion}
        
    # Find up to 3 similar resolved issues
    similar_issues = db.query(models.Issue).filter(
        models.Issue.status == models.IssueStatus.resolved,
        models.Issue.category == issue.category,
        models.Issue.id != issue.id
    ).order_by(models.Issue.updated_at.desc()).limit(3).all()
    
    suggestion = ai_service.generate_resolution_suggestion_with_context(
        issue.category.value if issue.category else "other",
        issue.description or "No description",
        issue.severity.value if issue.severity else "low",
        similar_issues
    )
    
    issue.ai_resolution_suggestion = suggestion
    db.commit()
    
    return {"suggestion": suggestion}

@router.post("/{issue_id}/micro-verify", response_model=dict)
def micro_verify_issue(
    issue_id: str,
    body: schemas.MicroVerificationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    import uuid
    try:
        issue_uuid = uuid.UUID(issue_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue = db.query(models.Issue).filter(models.Issue.id == issue_uuid).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Check if already verified
    existing = db.query(models.MicroVerification).filter(
        models.MicroVerification.issue_id == issue_uuid,
        models.MicroVerification.user_id == current_user.id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="You have already verified this issue")

    try:
        severity = models.PerceivedSeverity(body.perceived_severity)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid severity")

    verification = models.MicroVerification(
        issue_id=issue_uuid,
        user_id=current_user.id,
        photo_visible=body.photo_visible,
        location_accurate=body.location_accurate,
        perceived_severity=severity
    )
    db.add(verification)
    
    # Award points
    current_user.points += 5
    db.commit()
    
    return {"success": True, "points_earned": 5}

@router.get("/{issue_id}/community-assessment", response_model=schemas.CommunityAssessmentOut)
def get_community_assessment(
    issue_id: str,
    db: Session = Depends(get_db)
):
    import uuid
    try:
        issue_uuid = uuid.UUID(issue_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Issue not found")

    verifications = db.query(models.MicroVerification).filter(
        models.MicroVerification.issue_id == issue_uuid
    ).all()

    total = len(verifications)
    if total == 0:
        return schemas.CommunityAssessmentOut(
            total_assessments=0,
            photo_visible_percent=0.0,
            location_accurate_percent=0.0,
            most_common_severity=None
        )

    photo_yes = sum(1 for v in verifications if v.photo_visible)
    location_yes = sum(1 for v in verifications if v.location_accurate)
    
    severities = [v.perceived_severity.value for v in verifications]
    from collections import Counter
    most_common_severity = Counter(severities).most_common(1)[0][0] if severities else None

    return schemas.CommunityAssessmentOut(
        total_assessments=total,
        photo_visible_percent=(photo_yes / total) * 100,
        location_accurate_percent=(location_yes / total) * 100,
        most_common_severity=most_common_severity
    )
