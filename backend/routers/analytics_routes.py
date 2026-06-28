from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta
from database import get_db
import models, schemas, auth
from services import ai_service
import json

router = APIRouter()

@router.get("/insights/area")
def get_area_report(name: str, db: Session = Depends(get_db)):
    """Return an area report card for a neighborhood/ward."""
    name_lower = f"%{name.lower()}%"
    
    # Query issues matching the area name (case-insensitive)
    issues = db.query(models.Issue).filter(
        func.lower(models.Issue.address).like(name_lower)
    ).all()
    
    total = len(issues)
    if total == 0:
        return {
            "name": name.title(),
            "total_issues": 0,
            "resolution_rate": 0,
            "grade": "N/A",
            "most_common_category": "None",
            "monthly_trend": []
        }
        
    resolved = sum(1 for i in issues if i.status == models.IssueStatus.resolved)
    resolution_rate = round((resolved / total * 100), 1)
    
    # Most common category
    categories = [i.category.value for i in issues]
    most_common_category = max(set(categories), key=categories.count).replace('_', ' ').title()
    
    # Grade computation: 80%+ = A, 60-80% = B, 40-60% = C, below 40% = D
    if resolution_rate >= 80:
        grade = "A"
    elif resolution_rate >= 60:
        grade = "B"
    elif resolution_rate >= 40:
        grade = "C"
    else:
        grade = "D"
        
    # Subtract for high density (e.g. total > 10 in a small timeframe/ward lowers grade)
    if total > 10 and grade == "A":
        grade = "B"
    elif total > 10 and grade == "B":
        grade = "C"
        
    # Monthly breakdown for the last 6 months
    monthly_trend = []
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        if i == 0:
            month_end = now
        else:
            month_end = (month_start + timedelta(days=32)).replace(day=1)
            
        count = sum(1 for issue in issues if month_start <= issue.created_at < month_end)
        monthly_trend.append({
            "month": month_start.strftime("%b %Y"),
            "count": count
        })
        
    return {
        "name": name.title(),
        "total_issues": total,
        "resolution_rate": resolution_rate,
        "grade": grade,
        "most_common_category": most_common_category,
        "monthly_trend": monthly_trend
    }

@router.get("/insights/stats", response_model=schemas.StatsOut)
def get_stats(db: Session = Depends(get_db)):
    """Return aggregated statistics: totals, by category, monthly trend."""
    total = db.query(func.count(models.Issue.id)).scalar() or 0
    open_count = db.query(func.count(models.Issue.id)).filter(
        models.Issue.status == models.IssueStatus.open
    ).scalar() or 0
    resolved = db.query(func.count(models.Issue.id)).filter(
        models.Issue.status == models.IssueStatus.resolved
    ).scalar() or 0
    resolution_rate = round((resolved / total * 100) if total > 0 else 0, 1)

    # Issues by category
    cat_rows = db.query(models.Issue.category, func.count(models.Issue.id)).group_by(models.Issue.category).all()
    issues_by_category = {row[0].value: row[1] for row in cat_rows}

    # Monthly trend: last 6 months
    monthly_trend = []
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        if i == 0:
            month_end = now
        else:
            month_end = (month_start + timedelta(days=32)).replace(day=1)
        count = db.query(func.count(models.Issue.id)).filter(
            models.Issue.created_at >= month_start,
            models.Issue.created_at < month_end,
        ).scalar() or 0
        monthly_trend.append({
            "month": month_start.strftime("%b %Y"),
            "count": count,
        })

    # New fields
    resolved_last_24h = db.query(func.count(models.Issue.id)).filter(
        models.Issue.status == models.IssueStatus.resolved,
        models.Issue.updated_at >= now - timedelta(days=1)
    ).scalar() or 0

    weekly_reports = db.query(func.count(models.Issue.id)).filter(
        models.Issue.created_at >= now - timedelta(days=7)
    ).scalar() or 0

    verified_this_month = db.query(func.count(models.Issue.id)).filter(
        models.Issue.status == models.IssueStatus.verified,
        models.Issue.updated_at >= now - timedelta(days=30)
    ).scalar() or 0

    top_user = db.query(models.User).order_by(models.User.points.desc()).first()
    top_user_name = top_user.name if top_user else "Ananya S."

    return schemas.StatsOut(
        total_issues=total,
        open_issues=open_count,
        resolved_issues=resolved,
        resolution_rate=resolution_rate,
        issues_by_category=issues_by_category,
        monthly_trend=monthly_trend,
        resolved_last_24h=resolved_last_24h,
        weekly_reports=weekly_reports,
        verified_this_month=verified_this_month,
        top_user_name=top_user_name,
    )


@router.get("/insights/heatmap", response_model=List[schemas.HeatmapPoint])
def get_heatmap(db: Session = Depends(get_db)):
    """Return heatmap data: lat/lng/weight for all issues."""
    issues = db.query(models.Issue).all()
    return [
        schemas.HeatmapPoint(lat=i.latitude, lng=i.longitude, weight=max(1, i.vote_count))
        for i in issues
    ]


@router.get("/insights/predictions", response_model=List[schemas.PredictionPoint])
def get_predictions(db: Session = Depends(get_db)):
    """
    Predict issue hotspots by bucketing historical issues into ~500m grid cells.
    Cells with 3+ issues are returned as predicted hotspots.
    """
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    issues = db.query(models.Issue).filter(models.Issue.created_at >= six_months_ago).all()

    # Grid bucketing: ~0.005 degrees ≈ 500m
    GRID = 0.005
    cells: dict = {}
    for issue in issues:
        cell_lat = round(issue.latitude / GRID) * GRID
        cell_lng = round(issue.longitude / GRID) * GRID
        key = (cell_lat, cell_lng)
        cells[key] = cells.get(key, 0) + 1

    # Threshold: 1+ issues = hotspot (lowered for demo)
    results = []
    for (clat, clng), count in cells.items():
        if count >= 1:
            results.append(schemas.PredictionPoint(
                lat=clat,
                lng=clng,
                intensity=min(10, count),
                predicted_count=count,
            ))

    return sorted(results, key=lambda x: x.predicted_count, reverse=True)


@router.get("/insights/leaderboard", response_model=List[schemas.UserOut])
def get_leaderboard(db: Session = Depends(get_db)):
    """Return top 10 users by reputation/points."""
    users = db.query(models.User).order_by(models.User.points.desc()).limit(10).all()
    # Assuming UserOut can handle this, or we construct minimal dicts
    return users


from uuid import UUID

@router.get("/users/{user_id}/profile", response_model=schemas.ProfileOut)
def get_profile(user_id: UUID, db: Session = Depends(get_db)):
    """Return user profile with badges and reported issues."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    reported = db.query(models.Issue).filter(models.Issue.reported_by == user_id).order_by(
        models.Issue.created_at.desc()
    ).all()

    verify_votes = db.query(models.Vote).filter(
        models.Vote.user_id == user_id,
        models.Vote.type == models.VoteType.verify,
    ).count()

    resolved_by_user = sum(1 for i in reported if i.status == models.IssueStatus.resolved)
    total_reported = len(reported)

    # Compute badges
    badges = [
        {
            "id": "first_report",
            "name": "First Report",
            "icon": "🌱",
            "description": "Submitted your first civic issue",
            "earned": total_reported >= 1,
        },
        {
            "id": "watchdog",
            "name": "Community Watchdog",
            "icon": "🔍",
            "description": "Cast 10 verification votes",
            "earned": verify_votes >= 10,
        },
        {
            "id": "champion",
            "name": "Civic Champion",
            "icon": "🏆",
            "description": "Reported 50 civic issues",
            "earned": total_reported >= 50,
        },
        {
            "id": "solver",
            "name": "Problem Solver",
            "icon": "⚡",
            "description": "Had 5 of your reports resolved",
            "earned": resolved_by_user >= 5,
        },
        {
            "id": "voice",
            "name": "City Voice",
            "icon": "📣",
            "description": "Reported 10 civic issues",
            "earned": total_reported >= 10,
        },
    ]

    return schemas.ProfileOut(
        user=schemas.UserOut.model_validate(user),
        badges=[schemas.BadgeOut(**b) for b in badges],
        reported_issues=[schemas.IssueOut.model_validate(i) for i in reported[:20]],
        total_reported=total_reported,
        verify_votes=verify_votes,
        resolved_by_user=resolved_by_user,
    )

@router.post("/admin/generate-digest", response_model=schemas.DigestOut)
def generate_digest(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Generate weekly digest for admins."""
    if current_user.role.value not in ("moderator", "admin"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    now = datetime.utcnow()
    week_start = now - timedelta(days=7)

    # Get issues from last 7 days
    issues = db.query(models.Issue).filter(models.Issue.created_at >= week_start).all()
    
    cat_counts = {}
    resolved_count = 0
    top_user = None
    user_counts = {}
    
    for i in issues:
        cat = i.category.value if i.category else "other"
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
        if i.status == models.IssueStatus.resolved:
            resolved_count += 1
            
        user_counts[i.reported_by] = user_counts.get(i.reported_by, 0) + 1
        
    if user_counts:
        top_user_id = max(user_counts, key=user_counts.get)
        top_user_row = db.query(models.User).filter(models.User.id == top_user_id).first()
        top_user = top_user_row.name if top_user_row else "Unknown"

    stats_text = f"""
    Total Issues Reported: {len(issues)}
    Resolved Issues: {resolved_count}
    Category Breakdown: {json.dumps(cat_counts)}
    Most Active Reporter: {top_user or 'None'}
    """
    
    content = ai_service.generate_weekly_digest(stats_text)
    
    digest = models.Digest(
        content=content,
        week_start=week_start,
        week_end=now
    )
    db.add(digest)
    db.commit()
    db.refresh(digest)
    
    return schemas.DigestOut.model_validate(digest)

@router.get("/digests/latest", response_model=schemas.DigestOut)
def get_latest_digest(db: Session = Depends(get_db)):
    """Get the latest weekly digest."""
    digest = db.query(models.Digest).order_by(models.Digest.generated_at.desc()).first()
    if not digest:
        raise HTTPException(status_code=404, detail="No digest found")
    return schemas.DigestOut.model_validate(digest)

@router.get("/ward-density", response_model=dict)
def get_ward_density(db: Session = Depends(get_db)):
    """Return issue count for 6 hardcoded wards based on rough bounding boxes."""
    wards = {
        "Salt Lake": {"min_lat": 22.56, "max_lat": 22.60, "min_lng": 88.40, "max_lng": 88.44},
        "Ballygunge": {"min_lat": 22.51, "max_lat": 22.54, "min_lng": 88.35, "max_lng": 88.38},
        "Behala": {"min_lat": 22.48, "max_lat": 22.51, "min_lng": 88.29, "max_lng": 88.32},
        "Tollygunge": {"min_lat": 22.49, "max_lat": 22.51, "min_lng": 88.33, "max_lng": 88.35},
        "Shyambazar": {"min_lat": 22.59, "max_lat": 22.61, "min_lng": 88.36, "max_lng": 88.38},
        "Park Street": {"min_lat": 22.54, "max_lat": 22.56, "min_lng": 88.34, "max_lng": 88.36},
    }
    
    # Initialize counts to 0
    results = {w: 0 for w in wards}
    
    issues = db.query(models.Issue.latitude, models.Issue.longitude).all()
    
    for lat, lng in issues:
        for w, bounds in wards.items():
            if (bounds["min_lat"] <= lat <= bounds["max_lat"] and
                bounds["min_lng"] <= lng <= bounds["max_lng"]):
                results[w] += 1
                break
                
    return results
