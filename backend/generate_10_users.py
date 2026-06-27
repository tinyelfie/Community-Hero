import requests
import random
import time

API_URL = "http://localhost:8000/api"

users_data = []
issues_data = []

categories = ["Infrastructure", "Sanitation", "Public Safety", "Greenery/Parks", "Other"]
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
    {"title": "Huge Pothole causing traffic", "description": "There is a massive pothole that needs immediate repair."},
    {"title": "Garbage overflow", "description": "The community bin has not been cleared for 3 days."},
    {"title": "Broken Streetlight", "description": "The street is completely dark at night, causing safety concerns."},
    {"title": "Fallen tree branch", "description": "A large branch fell during the storm blocking the walkway."},
    {"title": "Water logging", "description": "The drain is clogged and dirty water is overflowing onto the street."},
    {"title": "Stray dog menace", "description": "A pack of aggressive stray dogs chasing two-wheelers."},
    {"title": "Illegal parking", "description": "Cars parked on the pavement blocking pedestrian movement."},
    {"title": "Open Manhole", "description": "Extremely dangerous open manhole near the school gate."},
    {"title": "Broken bench in park", "description": "The seating arrangement in the public park is vandalized."},
    {"title": "Graffiti on public wall", "description": "Offensive graffiti spray-painted on the community center wall."}
]

print("### Generated Users and Reports\\n")
print("| Name | Email | Password | Report Title | Category |")
print("|---|---|---|---|---|")

for i in range(10):
    # 1. Register User
    name = f"User {i+1}"
    email = f"user{i+1}_{int(time.time())}@example.com"
    password = f"SecurePass{i+1}!"
    
    reg_resp = requests.post(f"{API_URL}/auth/register", json={
        "name": name,
        "email": email,
        "password": password
    })
    
    if reg_resp.status_code not in (200, 201):
        print(f"Failed to register {email}: {reg_resp.text}")
        continue
        
    # 2. Login User
    login_resp = requests.post(f"{API_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    token = login_resp.json().get("access_token")
    
    # 3. Create Report
    issue = issues_details[i]
    loc = locations[i]
    category = random.choice(categories)
    
    report_data = {
        "title": issue["title"],
        "description": issue["description"],
        "category": category,
        "latitude": loc["lat"],
        "longitude": loc["lng"]
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    # Using multipart/form-data with requests requires files parameter, but we can just send normal form data
    # Wait, the API expects multipart/form-data or application/x-www-form-urlencoded?
    # Our API in main.py takes Form(...) fields. So data=... in requests works as form data.
    issue_resp = requests.post(f"{API_URL}/issues", data=report_data, headers=headers)
    
    if issue_resp.status_code in (200, 201):
        print(f"| {name} | {email} | {password} | {issue['title']} | {category} |")
    else:
        print(f"Failed to create report for {email}: {issue_resp.text}")
