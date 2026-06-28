import os
import json
import random
import uuid
import sys
from datetime import datetime, timedelta
import pandas as pd
import shutil

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
import models
from auth import hash_password

CATEGORIES = {
    "pothole": models.IssueCategory.pothole,
    "streetlight": models.IssueCategory.streetlight,
    "water_leak": models.IssueCategory.water_leak,
    "waste": models.IssueCategory.waste,
    "drainage": models.IssueCategory.drainage,
    "fallen_tree": models.IssueCategory.fallen_tree,
    "broken_sidewalk": models.IssueCategory.broken_sidewalk,
    "stray_animal": models.IssueCategory.stray_animal,
    "illegal_parking": models.IssueCategory.illegal_parking,
    "vandalism": models.IssueCategory.vandalism
}

CITIES = [
    {"name": "Mumbai", "lat": 19.0760, "lng": 72.8777},
    {"name": "Delhi", "lat": 28.7041, "lng": 77.1025},
    {"name": "Bangalore", "lat": 12.9716, "lng": 77.5946},
    {"name": "Hyderabad", "lat": 17.3850, "lng": 78.4867},
    {"name": "Ahmedabad", "lat": 23.0225, "lng": 72.5714},
    {"name": "Chennai", "lat": 13.0827, "lng": 80.2707},
    {"name": "Kolkata", "lat": 22.5726, "lng": 88.3639},
    {"name": "Pune", "lat": 18.5204, "lng": 73.8567},
    {"name": "Jaipur", "lat": 26.9124, "lng": 75.7873},
    {"name": "Lucknow", "lat": 26.8467, "lng": 80.9462},
]

def get_random_location(city_name=None):
    city = None
    if city_name:
        for c in CITIES:
            if c["name"].lower() == str(city_name).lower():
                city = c
                break
    if not city:
        city = random.choice(CITIES)
    lat_offset = random.uniform(-0.1, 0.1)
    lng_offset = random.uniform(-0.1, 0.1)
    return city["lat"] + lat_offset, city["lng"] + lng_offset

def copy_images():
    print("Copying images from Pictures to uploads...")
    os.makedirs("uploads", exist_ok=True)
    pics_dir = "../Pictures"
    if not os.path.exists(pics_dir):
        print(f"Pictures directory {pics_dir} not found!")
        return {}
    
    images = {}
    for filename in os.listdir(pics_dir):
        if filename.endswith(".jpg"):
            cat_name = filename.replace(".jpg", "").lower().replace(" ", "_")
            if cat_name == "street_light":
                cat_name = "streetlight"
            elif cat_name == "waste_management":
                cat_name = "waste"
                
            shutil.copy(os.path.join(pics_dir, filename), os.path.join("uploads", filename))
            
            for key, val in CATEGORIES.items():
                if key == cat_name:
                    images[val] = filename
                    break
    return images

def seed():
    print("Dropping and recreating database...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    images = copy_images()
    
    print("Loading users from users.json...")
    with open("users.json", "r", encoding="utf-8") as f:
        user_data = json.load(f)
        
    password_hash = hash_password("password123")
    
    users = []
    citizens = []
    officials = []
    
    test_citizen = models.User(
        name="Citizen Tester",
        email="citizen@test.com",
        password_hash=password_hash,
        role=models.UserRole.citizen,
        points=150
    )
    users.append(test_citizen)
    citizens.append(test_citizen)
    
    test_mod = models.User(
        name="Moderator Tester",
        email="mod@test.com",
        password_hash=password_hash,
        role=models.UserRole.moderator,
        points=500
    )
    users.append(test_mod)
    
    test_admin = models.User(
        name="Admin Tester",
        email="admin@test.com",
        password_hash=password_hash,
        role=models.UserRole.admin,
        points=0
    )
    users.append(test_admin)
    officials.append(test_admin)
    
    for cit in user_data["citizens"]:
        u = models.User(
            name=cit["name"],
            email=cit["email"],
            password_hash=password_hash,
            role=models.UserRole.citizen,
            points=cit["points"]
        )
        users.append(u)
        citizens.append(u)
        
    for gov in user_data["officials"]:
        u = models.User(
            name=gov["name"],
            email=gov["email"],
            password_hash=password_hash,
            role=models.UserRole.admin,
            points=0
        )
        users.append(u)
        officials.append(u)
        
    db.add_all(users)
    db.commit()
    
    print("Reading incidents.xlsx...")
    if not os.path.exists("incidents.xlsx"):
        print("Error: incidents.xlsx not found.")
        return
        
    df = pd.read_excel("incidents.xlsx")
    issues = []
    now = datetime.utcnow()
    
    for idx, row in df.iterrows():
        if pd.isna(row["category"]) or pd.isna(row["title"]):
            continue
            
        cat_str = str(row["category"]).lower().strip()
        cat = CATEGORIES.get(cat_str, models.IssueCategory.other)
        
        reporter = random.choice(citizens)
        
        r = random.random()
        if r < 0.4:
            status = models.IssueStatus.resolved
        elif r < 0.7:
            status = models.IssueStatus.verified
        elif r < 0.9:
            status = models.IssueStatus.open
        else:
            status = models.IssueStatus.in_progress
            
        created_at = now - timedelta(days=random.randint(1, 180), hours=random.randint(0, 24))
        
        city = str(row["city"]).strip() if not pd.isna(row["city"]) else None
        lat, lng = get_random_location(city)
        
        sev_str = str(row["severity"]).lower().strip() if not pd.isna(row["severity"]) else "low"
        try:
            severity = models.IssueSeverity(sev_str)
        except ValueError:
            severity = models.IssueSeverity.low
            
        img_filename = images.get(cat, "default.jpg")
        
        issue = models.Issue(
            title=str(row["title"])[:250],
            description=str(row["description"]),
            category=cat,
            severity=severity,
            status=status,
            latitude=lat,
            longitude=lng,
            address=str(row["address"]) if not pd.isna(row["address"]) else None,
            image_url=f"/uploads/{img_filename}",
            reported_by=reporter.id,
            vote_count=random.randint(1, 100) if status != models.IssueStatus.open else random.randint(1, 5),
            created_at=created_at,
            updated_at=created_at + timedelta(days=random.randint(1, 10)),
            status_changed_at=created_at + timedelta(days=random.randint(1, 10))
        )
        
        if status == models.IssueStatus.resolved:
            issue.assigned_to = random.choice(officials).id
            
        issues.append(issue)
        
    print(f"Adding {len(issues)} issues to database...")
    db.add_all(issues)
    db.commit()
    print("Database seeding complete!")

if __name__ == "__main__":
    seed()
