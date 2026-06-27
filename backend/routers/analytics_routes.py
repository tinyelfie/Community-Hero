from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta
from database import get_db
import models, schemas, auth

router = APIRouter()


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

    return schemas.StatsOut(
        total_issues=total,
        open_issues=open_count,
        resolved_issues=resolved,
        resolution_rate=resolution_rate,
        issues_by_category=issues_by_category,
        monthly_trend=monthly_trend,
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
