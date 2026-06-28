from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models
from datetime import datetime, timedelta
import random

router = APIRouter()

@router.post("/seed-demo")
def seed_demo_data(db: Session = Depends(get_db)):
    """
    Seeds the database with a highly realistic set of 25 issues for Demo Day.
    Resets the entire database first.
    """
    print("Dropping and recreating all tables for Demo Mode...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Create Users
    admin = models.User(
        email="admin@example.com",
        name="Admin User",
        password_hash="$2b$12$igpBBzbvsKS.KJU8ElMVZ.Pyf6EJCx2c7lCI4DmjzTJVmaAgPBoFm",
        role=models.UserRole.admin
    )
    moderator = models.User(
        email="moderator@example.com",
        name="Sarah (Moderator)",
        password_hash="$2b$12$igpBBzbvsKS.KJU8ElMVZ.Pyf6EJCx2c7lCI4DmjzTJVmaAgPBoFm",
        role=models.UserRole.moderator
    )
    citizen = models.User(
        email="citizen@example.com",
        name="Ananya S.",
        password_hash="$2b$12$igpBBzbvsKS.KJU8ElMVZ.Pyf6EJCx2c7lCI4DmjzTJVmaAgPBoFm",
        role=models.UserRole.citizen,
        points=150
    )
    
    db.add_all([admin, moderator, citizen])
    db.commit()
    db.refresh(admin)
    db.refresh(moderator)
    db.refresh(citizen)
    
    now = datetime.utcnow()
    
    # Define some realistic Kolkata locations
    locations = [
        {"address": "Salt Lake Sector V, Kolkata", "lat": 22.58, "lng": 88.42},
        {"address": "Ballygunge, Kolkata", "lat": 22.52, "lng": 88.36},
        {"address": "Park Street, Kolkata", "lat": 22.55, "lng": 88.35},
        {"address": "New Town, Kolkata", "lat": 22.58, "lng": 88.46},
        {"address": "Jadavpur, Kolkata", "lat": 22.49, "lng": 88.37}
    ]
    
    issues_data = [
        ("Huge Pothole near Park Street", "Giant pothole causing traffic jam.", models.IssueCategory.pothole, models.IssueSeverity.high, models.IssueStatus.resolved, True, 47, 5, True),
        ("Broken Streetlight in Salt Lake", "Streetlight is completely broken.", models.IssueCategory.streetlight, models.IssueSeverity.medium, models.IssueStatus.in_progress, False, 34, 3, False),
        ("Overflowing Garbage Bin", "Bin has not been cleared for 3 days.", models.IssueCategory.waste, models.IssueSeverity.medium, models.IssueStatus.verified, False, 28, 2, False),
        ("Water pipe bursting", "Water flooding the street.", models.IssueCategory.water_leak, models.IssueSeverity.critical, models.IssueStatus.open, False, 15, 1, True),
        ("Blocked Drainage", "Drainage is blocked, waterlogging after rain.", models.IssueCategory.drainage, models.IssueSeverity.high, models.IssueStatus.in_progress, False, 42, 6, True),
        ("Fallen tree branch", "Tree branch blocking the footpath.", models.IssueCategory.other, models.IssueSeverity.medium, models.IssueStatus.resolved, True, 19, 4, False),
    ]
    
    # Seed 25 issues total by recycling data with variations
    for i in range(25):
        base_data = issues_data[i % len(issues_data)]
        loc = locations[i % len(locations)]
        
        # Add some jitter to coordinates
        lat = loc["lat"] + random.uniform(-0.01, 0.01)
        lng = loc["lng"] + random.uniform(-0.01, 0.01)
        
        created = now - timedelta(days=random.randint(1, 60))
        status = base_data[4]
        if i > 15 and status == models.IssueStatus.resolved:
            status = models.IssueStatus.open
            
        is_escalated = base_data[8] if status != models.IssueStatus.resolved else False
        
        category_keyword = base_data[2].value.replace('_', ' ')
        img_url = f"https://loremflickr.com/800/600/{category_keyword},india,street?lock={i}"
            
        issue = models.Issue(
            title=f"{base_data[0]} #{i+1}",
            description=base_data[1],
            category=base_data[2],
            severity=base_data[3],
            status=status,
            latitude=lat,
            longitude=lng,
            address=loc["address"],
            image_url=img_url,
            resolution_image_url=f"https://loremflickr.com/800/600/repair,worker?lock={i}" if status == models.IssueStatus.resolved and base_data[5] else None,
            vote_count=random.randint(1, 47),
            reported_by=citizen.id if i % 2 == 0 else admin.id,
            assigned_to=moderator.id if status in [models.IssueStatus.in_progress, models.IssueStatus.resolved] else None,
            created_at=created,
            updated_at=created + timedelta(days=random.randint(1, 5)),
            status_changed_at=now - timedelta(days=random.randint(0, 3)) if status == models.IssueStatus.in_progress else None,
            is_escalated=is_escalated,
            estimated_cost_min=random.randint(2000, 5000),
            estimated_cost_max=random.randint(6000, 15000)
        )
        db.add(issue)
        db.commit()
        db.refresh(issue)
        
        # Add some organic comments
        db.add(models.Comment(
            issue_id=issue.id,
            user_id=citizen.id,
            body="This is a big problem in our area. Please fix soon!",
            created_at=created + timedelta(hours=2)
        ))
        
        if status in [models.IssueStatus.in_progress, models.IssueStatus.resolved]:
            db.add(models.Comment(
                issue_id=issue.id,
                user_id=moderator.id,
                body="We have dispatched a team to investigate this.",
                is_authority_update=True,
                created_at=created + timedelta(days=1)
            ))
            
        if is_escalated:
             db.add(models.Comment(
                issue_id=issue.id,
                user_id=None,
                body="🚨 Auto-escalated due to high community verification and no recent activity.",
                is_authority_update=True,
                created_at=created + timedelta(days=2)
            ))
             
    db.commit()
    
    # Generate a mock digest
    digest = models.Digest(
        week_start=now - timedelta(days=7),
        week_end=now,
        content="A busy week in Kolkata. Salt Lake saw several infrastructure updates, while Park Street teams focused on drainage."
    )
    db.add(digest)
    db.commit()
    
    return {"message": "Demo data successfully seeded."}
