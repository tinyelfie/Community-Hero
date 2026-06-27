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
def auth_token_2(client):
    client.post("/api/auth/register", json={
        "name": "Citizen2",
        "email": "citizen2@test.com",
        "password": "password123"
    })
    resp = client.post("/api/auth/login", json={
        "email": "citizen2@test.com",
        "password": "password123"
    })
    return resp.json()["access_token"]

@pytest.fixture
def issue_id(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    resp = client.post(
        "/api/issues", 
        headers=headers,
        data={
            "title": "Pothole on Main St",
            "latitude": 22.5,
            "longitude": 88.3,
        }
    )
    return resp.json()["id"]

def test_vote_on_issue(client, auth_token_2, issue_id):
    headers = {"Authorization": f"Bearer {auth_token_2}"}
    
    # Vote UP
    resp = client.post(
        f"/api/issues/{issue_id}/vote",
        headers=headers,
        json={"type": "upvote"}
    )
    assert resp.status_code == 200
    
    # Check issue vote count
    issue_resp = client.get(f"/api/issues/{issue_id}")
    assert issue_resp.json()["vote_count"] == 1

def test_double_vote_same_user(client, auth_token_2, issue_id):
    headers = {"Authorization": f"Bearer {auth_token_2}"}
    
    client.post(
        f"/api/issues/{issue_id}/vote",
        headers=headers,
        json={"type": "upvote"}
    )
    
    # Vote again should return 409
    resp2 = client.post(
        f"/api/issues/{issue_id}/vote",
        headers=headers,
        json={"type": "upvote"}
    )
    assert resp2.status_code == 409

def test_comment_on_issue(client, auth_token, issue_id):
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    resp = client.post(
        f"/api/issues/{issue_id}/comments",
        headers=headers,
        json={"body": "I saw this too!"}
    )
    assert resp.status_code == 201
    assert resp.json()["body"] == "I saw this too!"
    
    # Check issue details has comment
    issue_resp = client.get(f"/api/issues/{issue_id}")
    assert len(issue_resp.json()["comments"]) == 1
    assert issue_resp.json()["comments"][0]["body"] == "I saw this too!"
