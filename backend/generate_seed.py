import json
import random

cities = [
    {'name': 'Delhi', 'lat': 28.6139, 'lng': 77.2090},
    {'name': 'Mumbai', 'lat': 19.0760, 'lng': 72.8777},
    {'name': 'Bangalore', 'lat': 12.9716, 'lng': 77.5946},
    {'name': 'Chennai', 'lat': 13.0827, 'lng': 80.2707},
    {'name': 'Kolkata', 'lat': 22.5726, 'lng': 88.3639},
    {'name': 'Hyderabad', 'lat': 17.3850, 'lng': 78.4867},
    {'name': 'Pune', 'lat': 18.5204, 'lng': 73.8567},
    {'name': 'Ahmedabad', 'lat': 23.0225, 'lng': 72.5714},
    {'name': 'Jaipur', 'lat': 26.9124, 'lng': 75.7873},
    {'name': 'Lucknow', 'lat': 26.8467, 'lng': 80.9462},
]

categories = ['pothole', 'streetlight', 'drainage', 'water_leak', 'waste', 'other']
severities = ['low', 'medium', 'high', 'critical']
statuses = ['open', 'in_progress', 'resolved', 'verified']

issues_data = []
for i in range(50):
    city = random.choice(cities)
    cat = random.choice(categories)
    sev = random.choice(severities)
    status = random.choice(statuses)
    
    # Random offset up to ~5km
    lat = city['lat'] + random.uniform(-0.05, 0.05)
    lng = city['lng'] + random.uniform(-0.05, 0.05)
    
    issues_data.append({
        'title': f'{cat.capitalize()} issue reported in {city["name"]}',
        'description': f'This is a {sev} severity {cat} issue in the {city["name"]} area.',
        'category': cat,
        'severity': sev,
        'status': status,
        'latitude': round(lat, 4),
        'longitude': round(lng, 4),
        'address': f'Somewhere in {city["name"]}, India',
        'vote_count': random.randint(1, 150),
        'ai_summary': f'Automated summary for {cat} in {city["name"]}.',
        'ai_tags': f'{cat}, {city["name"]}, issue',
        'days_ago': random.randint(1, 100),
    })

seed_code = f"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, create_tables
from auth import hash_password
import models
from datetime import datetime, timedelta
import uuid

create_tables()
db = SessionLocal()

for table in [models.Comment, models.Vote, models.Issue, models.User]:
    db.query(table).delete()
db.commit()

users = [
    models.User(
        id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        name="Rahul Sharma",
        email="citizen@test.com",
        password_hash=hash_password("test123"),
        role=models.UserRole.citizen,
        points=120,
    ),
    models.User(
        id=uuid.UUID("00000000-0000-0000-0000-000000000002"),
        name="Priya Patel",
        email="mod@test.com",
        password_hash=hash_password("test123"),
        role=models.UserRole.moderator,
        points=450,
    ),
    models.User(
        id=uuid.UUID("00000000-0000-0000-0000-000000000003"),
        name="Amit Singh",
        email="admin@test.com",
        password_hash=hash_password("test123"),
        role=models.UserRole.admin,
        points=890,
    ),
]
for u in users:
    db.add(u)
db.commit()

issues_data = {json.dumps(issues_data, indent=4)}

# unquote enums
for item in issues_data:
    item['category'] = getattr(models.IssueCategory, item['category'])
    item['severity'] = getattr(models.IssueSeverity, item['severity'])
    item['status'] = getattr(models.IssueStatus, item['status'])

reporter_ids = [u.id for u in users]
for i, data in enumerate(issues_data):
    days = data.pop("days_ago")
    created = datetime.utcnow() - timedelta(days=days)
    issue = models.Issue(
        **data,
        reported_by=reporter_ids[i % 3],
        created_at=created,
        updated_at=created,
    )
    db.add(issue)
db.commit()
print("Seeding complete with 50 issues across India and Indian users.")
"""
open('seed.py', 'w').write(seed_code)
