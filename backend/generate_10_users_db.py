import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, create_tables
from auth import hash_password
import models
import uuid
import time
import random

create_tables()
db = SessionLocal()

categories = [models.IssueCategory.pothole, models.IssueCategory.streetlight, 
              models.IssueCategory.water_leak, models.IssueCategory.waste, 
              models.IssueCategory.drainage, models.IssueCategory.other]
locations = [
    {"lat": 22.5726, "lng": 88.3639, "desc": "Park Street Crossing"},
    {"lat": 22.518, "lng": 88.363, "desc": "Gariahat Market"},
    {"lat": 22.585, "lng": 88.346, "desc": "Howrah Bridge Approach"},
    {"lat": 22.623, "lng": 88.365, "desc": "Salt Lake Sector V"},
    {"lat": 22.528, "lng": 88.362, "desc": "Ballygunge Phari"},
    {"lat": 22.605, "lng": 88.369, "desc": "New Town Rajarhat"},
    {"lat": 22.569, "lng": 88.361, "desc": "Esplanade Metro Station"},
    {"lat": 22.535, "lng": 88.344, "desc": "Alipore Zoo Gate"},
    {"lat": 22.545, "lng": 88.356, "desc": "Rabindra Sadan"},
    {"lat": 22.555, "lng": 88.334, "desc": "Victoria Memorial South Gate"}
]

issues_details = [
    {"title": "Huge Pothole causing traffic", "description": "There is a massive pothole that needs immediate repair.", "severity": models.IssueSeverity.medium},
    {"title": "Garbage overflow", "description": "The community bin has not been cleared for 3 days.", "severity": models.IssueSeverity.medium},
    {"title": "Broken Streetlight", "description": "The street is completely dark at night, causing safety concerns.", "severity": models.IssueSeverity.high},
    {"title": "Fallen tree branch", "description": "A large branch fell during the storm blocking the walkway.", "severity": models.IssueSeverity.medium},
    {"title": "Water logging", "description": "The drain is clogged and dirty water is overflowing onto the street.", "severity": models.IssueSeverity.low},
    {"title": "Stray dog menace", "description": "A pack of aggressive stray dogs chasing two-wheelers.", "severity": models.IssueSeverity.high},
    {"title": "Illegal parking", "description": "Cars parked on the pavement blocking pedestrian movement.", "severity": models.IssueSeverity.low},
    {"title": "Open Manhole", "description": "Extremely dangerous open manhole near the school gate.", "severity": models.IssueSeverity.critical},
    {"title": "Broken bench in park", "description": "The seating arrangement in the public park is vandalized.", "severity": models.IssueSeverity.low},
    {"title": "Graffiti on public wall", "description": "Offensive graffiti spray-painted on the community center wall.", "severity": models.IssueSeverity.low}
]

print("### Generated Users and Reports\\n")
print("| Name | Email | Password | Report Title | Category |")
print("|---|---|---|---|---|")

for i in range(10):
    # 1. Register User
    name = f"User {i+1}"
    email = f"user{i+1}_{int(time.time())}@example.com"
    password = f"SecurePass{i+1}!"
    
    new_user = models.User(
        id=uuid.uuid4(),
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=models.UserRole.citizen,
        points=0
    )
    db.add(new_user)
    db.commit()
    
    # 2. Create Report
    issue = issues_details[i]
    loc = locations[i]
    category = random.choice(categories)
    
    new_issue = models.Issue(
        id=uuid.uuid4(),
        title=issue["title"],
        description=issue["description"],
        category=category,
        severity=issue["severity"],
        latitude=loc["lat"],
        longitude=loc["lng"],
        reported_by=new_user.id
    )
    db.add(new_issue)
    db.commit()
    
    print(f"| {name} | {email} | {password} | {issue['title']} | {category.value} |")

db.close()
