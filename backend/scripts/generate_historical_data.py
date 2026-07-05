import os
import sys
import random
from datetime import datetime, timedelta
import uuid

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database import engine, Base, SessionLocal
from models import User, Issue, IssueCategory, IssueSeverity, IssueStatus, Comment
from auth import hash_password
try:
    from services.sentiment_analyzer import get_sentiment_data
except ImportError:
    # Stub if not ready
    def get_sentiment_data(text):
        return 0.0, "low"

def generate_historical_data():
    # 1. Recreate database
    print("Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # 2. Create admin & dummy users
    users = []
    for i in range(10):
        u = User(
            name=f"User {i}",
            email=f"user{i}@example.com",
            password_hash=hash_password("password123"),
            is_verified_reporter=(i % 3 == 0)
        )
        db.add(u)
        users.append(u)
    
    admin = User(
        name="Admin User",
        email="admin@nagrik.in",
        password_hash=hash_password("admin123"),
        role="admin"
    )
    db.add(admin)
    db.commit()

    # 3. Generate 6 months of historical issues
    # 26 weeks of data
    areas = ["Salt Lake", "Behala", "New Town", "Ballygunge", "Park Street"]
    
    categories = [e.value for e in IssueCategory]
    severities = [e.value for e in IssueSeverity]
    
    print("Generating issues spanning 26 weeks...")
    
    now = datetime.utcnow()
    
    for week_offset in range(26, -1, -1):
        week_date = now - timedelta(weeks=week_offset)
        
        for area in areas:
            # Base logic for growth
            base_issues = 2
            if week_offset < 12: # Weeks 14-26 (more recent)
                base_issues += 2
            if week_offset < 4:  # Last month
                base_issues += 3
                
            # Random variation
            num_issues = max(1, base_issues + random.randint(-2, 3))
            
            # Simulate occasional spike
            if random.random() < 0.05:
                num_issues += random.randint(8, 12)
                
            # Area specific adjustments
            if area == "Salt Lake":
                num_issues = int(num_issues * 1.5)
            elif area == "Behala":
                num_issues = int(num_issues * 0.8)
                
            for _ in range(num_issues):
                # Random time within the week
                issue_date = week_date + timedelta(days=random.randint(0, 6), hours=random.randint(0, 23))
                
                cat = random.choice(categories)
                sev = random.choice(severities)
                reporter = random.choice(users)
                
                # Assign some text for sentiment
                desc_text = f"Reported issue in {area}. It looks like a {cat}. Needs attention."
                if random.random() < 0.2:
                    desc_text += " This is extremely dangerous and urgent!"
                
                compound, urgency = get_sentiment_data(desc_text)
                
                # Roughly correct coordinates for Kolkata
                base_lat, base_lng = 22.5726, 88.3639
                lat_offset = random.uniform(-0.05, 0.05)
                lng_offset = random.uniform(-0.05, 0.05)
                
                issue = Issue(
                    title=f"{cat.replace('_', ' ').title()} in {area}",
                    description=desc_text,
                    category=cat,
                    severity=sev,
                    status=IssueStatus.resolved if week_offset > 2 else random.choice([IssueStatus.open, IssueStatus.in_progress, IssueStatus.resolved]),
                    latitude=base_lat + lat_offset,
                    longitude=base_lng + lng_offset,
                    address=f"{area}, Kolkata, West Bengal",
                    vote_count=random.randint(0, 50),
                    reported_by=reporter.id,
                    created_at=issue_date,
                    updated_at=issue_date + timedelta(days=random.randint(1, 5)),
                    description_sentiment=compound,
                    urgency_level=urgency
                )
                db.add(issue)
                db.flush()
                
                # Add some comments
                if random.random() < 0.3:
                    c_text = "Hope this gets fixed soon." if random.random() > 0.5 else "This is terrible!"
                    c_comp, _ = get_sentiment_data(c_text)
                    comment = Comment(
                        issue_id=issue.id,
                        user_id=random.choice(users).id,
                        body=c_text,
                        sentiment_score=c_comp,
                        created_at=issue.created_at + timedelta(days=1)
                    )
                    db.add(comment)
                    
    db.commit()
    print("Database seeded with historical data successfully.")
    
if __name__ == "__main__":
    generate_historical_data()
