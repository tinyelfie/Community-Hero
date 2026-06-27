import pytest

@pytest.fixture
def auth_token(client):
    client.post("/api/auth/register", json={
        "name": "Citizen",
        "email": "citizen@test.com",
        "password": "password123"
    })
    resp = client.post("/api/auth/login", json={
        "email": "citizen@test.com",
        "password": "password123"
    })
    return resp.json()["access_token"]

@pytest.fixture
def admin_token(client, db):
    # Register a user
    client.post("/api/auth/register", json={
        "name": "Admin",
        "email": "admin@test.com",
        "password": "password123"
    })
    
    # Make them an admin directly via DB
    from models import User, UserRole
    user = db.query(User).filter(User.email == "admin@test.com").first()
    user.role = UserRole.admin
    db.commit()
    
    resp = client.post("/api/auth/login", json={
        "email": "admin@test.com",
        "password": "password123"
    })
    return resp.json()["access_token"]

def test_create_issue(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.post(
        "/api/issues", 
        headers=headers,
        data={
            "title": "Pothole on Main St",
            "description": "Large pothole causing issues.",
            "latitude": 22.5,
            "longitude": 88.3,
            "category": "pothole",
            "severity": "medium"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Pothole on Main St"
    assert data["status"] == "open"

def test_list_issues(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    client.post(
        "/api/issues", 
        headers=headers,
        data={
            "title": "Pothole on Main St",
            "latitude": 22.5,
            "longitude": 88.3,
        }
    )
    
    response = client.get("/api/issues")
    assert response.status_code == 200
    assert len(response.json()) >= 1

def test_update_status_unauthorized(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    resp1 = client.post(
        "/api/issues", 
        headers=headers,
        data={
            "title": "Pothole on Main St",
            "latitude": 22.5,
            "longitude": 88.3,
        }
    )
    issue_id = resp1.json()["id"]
    
    resp2 = client.patch(
        f"/api/issues/{issue_id}/status",
        headers=headers,
        json={"status": "resolved"}
    )
    assert resp2.status_code == 403

def test_update_status_admin(client, auth_token, admin_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    resp1 = client.post(
        "/api/issues", 
        headers=headers,
        data={
            "title": "Pothole on Main St",
            "latitude": 22.5,
            "longitude": 88.3,
        }
    )
    issue_id = resp1.json()["id"]
    
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    resp2 = client.patch(
        f"/api/issues/{issue_id}/status",
        headers=admin_headers,
        json={"status": "resolved"}
    )
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "resolved"

def test_get_nonexistent_issue(client):
    # Testing for the bug where 404 should be returned
    response = client.get("/api/issues/123e4567-e89b-12d3-a456-426614174000")
    assert response.status_code == 404
