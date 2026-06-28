import os
import sys
import random
import requests
import uuid
from datetime import datetime, timedelta
from faker import Faker

# Make generation deterministic so Render matches local exactly
Faker.seed(42)
random.seed(42)

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
import models
from auth import hash_password

fake = Faker('en_IN')

# Configuration
NUM_CITIZENS = 200
NUM_GOV = 25
NUM_ISSUES = 500

CATEGORIES = [
    models.IssueCategory.pothole,
    models.IssueCategory.streetlight,
    models.IssueCategory.water_leak,
    models.IssueCategory.waste,
    models.IssueCategory.drainage,
    models.IssueCategory.fallen_tree,
    models.IssueCategory.broken_sidewalk,
    models.IssueCategory.stray_animal,
    models.IssueCategory.illegal_parking,
    models.IssueCategory.vandalism
]

# Major Indian Cities for realistic distribution
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
    {"name": "Kanpur", "lat": 26.4499, "lng": 80.3319},
    {"name": "Nagpur", "lat": 21.1458, "lng": 79.0882},
    {"name": "Indore", "lat": 22.7196, "lng": 75.8577},
    {"name": "Thane", "lat": 19.2183, "lng": 72.9781},
    {"name": "Bhopal", "lat": 23.2599, "lng": 77.4126},
    {"name": "Visakhapatnam", "lat": 17.6868, "lng": 83.2185},
    {"name": "Patna", "lat": 25.5941, "lng": 85.1376},
    {"name": "Vadodara", "lat": 22.3072, "lng": 73.1812},
    {"name": "Ghaziabad", "lat": 28.6692, "lng": 77.4538},
    {"name": "Ludhiana", "lat": 30.9010, "lng": 75.8573},
]

def get_random_location():
    city = random.choice(CITIES)
    # Add small random offset (roughly within a 15-20km radius)
    lat_offset = random.uniform(-0.15, 0.15)
    lng_offset = random.uniform(-0.15, 0.15)
    return city["lat"] + lat_offset, city["lng"] + lng_offset

def download_images():
    print("Downloading 10 category images...")
    os.makedirs("uploads", exist_ok=True)
    images = {}
    for cat in CATEGORIES:
        filename = f"{cat.value}.jpg"
        filepath = os.path.join("uploads", filename)
        images[cat] = filename
        
        if os.path.exists(filepath):
            print(f"Skipping {cat.value}, already exists.")
            continue
            
        print(f"Fetching image for {cat.value}...")
        # Use loremflickr with category keyword
        keyword = cat.value.replace("_", ",")
        url = f"https://loremflickr.com/800/600/{keyword}"
        try:
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                with open(filepath, 'wb') as f:
                    f.write(r.content)
            else:
                print(f"Failed to fetch {url} (status {r.status_code})")
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            
    return images

def seed():
    print("Dropping and recreating database...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    images = download_images()
    
    print(f"Generating {NUM_CITIZENS} Citizens and {NUM_GOV} Gov Officials...")
    users = []
    citizens = []
    officials = []
    
    password_hash = hash_password("password123")
    
    # Always include the three reliable test accounts
    test_citizen = models.User(
        name="Citizen Tester",
        email="citizen@test.com",
        password_hash=password_hash,
        role=models.UserRole.citizen,
        points=250
    )
    test_mod = models.User(
        name="Moderator Tester",
        email="mod@test.com",
        password_hash=password_hash,
        role=models.UserRole.moderator,
        points=500
    )
    test_admin = models.User(
        name="Admin Tester",
        email="admin@test.com",
        password_hash=password_hash,
        role=models.UserRole.admin,
        points=999
    )
    users.extend([test_citizen, test_mod, test_admin])
    citizens.append(test_citizen)
    officials.append(test_admin)
    
    # Generate Citizens
    for _ in range(NUM_CITIZENS):
        u = models.User(
            name=fake.name(),
            email=fake.unique.email().replace('@', '@citizen.').lower(),
            password_hash=password_hash,
            role=models.UserRole.citizen,
            points=random.randint(0, 500)
        )
        users.append(u)
        citizens.append(u)
        
    # Generate Gov Officials
    for _ in range(NUM_GOV):
        u = models.User(
            name=fake.name(),
            email=fake.unique.email().replace('@', '@gov.').lower(),
            password_hash=password_hash,
            role=models.UserRole.admin,
            points=0
        )
        users.append(u)
        officials.append(u)
        
    db.add_all(users)
    db.commit()
    
    print(f"Generating {NUM_ISSUES} Issues...")
    issues = []
    now = datetime.utcnow()
    
    for _ in range(NUM_ISSUES):
        cat = random.choice(CATEGORIES)
        reporter = random.choice(citizens)
        
        # Mix of statuses
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
        
        lat, lng = get_random_location()
        issue = models.Issue(
            title=fake.sentence(nb_words=6)[:250],
            description=fake.paragraph(nb_sentences=3),
            category=cat,
            severity=random.choice(list(models.IssueSeverity)),
            status=status,
            latitude=lat,
            longitude=lng,
            address=fake.address(),
            image_url=f"/uploads/{images.get(cat, 'default.jpg')}",
            reported_by=reporter.id,
            vote_count=random.randint(1, 100) if status != models.IssueStatus.open else random.randint(1, 5),
            created_at=created_at,
            updated_at=created_at + timedelta(days=random.randint(1, 10)),
            status_changed_at=created_at + timedelta(days=random.randint(1, 10))
        )
        
        if status == models.IssueStatus.resolved:
            issue.assigned_to = random.choice(officials).id
            
        issues.append(issue)
        
    db.add_all(issues)
    db.commit()
    
    # Generate credentials.md
    print("Writing credentials.md...")
    with open("../credentials.md", "w", encoding="utf-8") as f:
        f.write("# Generated User Credentials\n\n")
        f.write("All passwords are: `password123`\n\n")
        
        f.write("## Government Officials\n\n")
        f.write("| Name | Email | Role |\n")
        f.write("|---|---|---|\n")
        for u in officials:
            f.write(f"| {u.name} | {u.email} | Gov/Admin |\n")
            
        f.write("\n## Citizens\n\n")
        f.write("| Name | Email | Points |\n")
        f.write("|---|---|---|\n")
        for u in citizens:
            f.write(f"| {u.name} | {u.email} | {u.points} |\n")
            
        f.write(f"\n## Generated Incidents Summary\n")
        f.write(f"Total Incidents: {NUM_ISSUES}\n")
        
    print("Mass seeding complete!")

if __name__ == "__main__":
    seed()
