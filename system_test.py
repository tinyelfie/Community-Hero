import subprocess
import requests
import sys
import time
import os

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"
BACKEND_DIR = os.path.join(os.path.dirname(__file__), "backend")
PYTHON = sys.executable

def test_system():
    print("=" * 60)
    print("  NAGRIK — FULL SYSTEM TEST SUITE")
    print("=" * 60)

    # ── Boot Backend ──────────────────────────────────────────────
    print("\n[SETUP] Starting backend server...")
    backend_proc = subprocess.Popen(
        [PYTHON, "-m", "uvicorn", "main:app", "--port", "8000"],
        cwd=BACKEND_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for i in range(15):
        try:
            if requests.get(f"{BASE_URL}/api/health").status_code in (200, 404):
                print(f"✅ [SETUP] Backend is up (attempt {i+1}).")
                break
        except requests.exceptions.ConnectionError:
            time.sleep(1)
    else:
        # try /docs
        try:
            requests.get(f"{BASE_URL}/docs")
            print("✅ [SETUP] Backend is up.")
        except:
            print("❌ [SETUP] Backend failed to start. Aborting.")
            backend_proc.terminate()
            sys.exit(1)

    results = []

    def check(name, passed, detail=""):
        icon = "✅" if passed else "❌"
        status = "PASS" if passed else "FAIL"
        msg = f"  {icon} [{status}] {name}"
        if detail:
            msg += f"  →  {detail}"
        print(msg)
        results.append((name, passed))
        return passed

    session = requests.Session()
    import time as _time
    unique_email = f"systest_{int(_time.time())}@test.com"

    # ── ST-01: Register a new user ─────────────────────────────────
    print("\n[AUTH] Testing user registration & login...")
    r = requests.post(f"{BASE_URL}/api/auth/register", json={"name": "System Tester", "email": unique_email, "password": "test123"})
    check("ST-01: User Registration", r.status_code in (200, 201), f"HTTP {r.status_code}")

    # ── ST-02: Login with registered user ─────────────────────────
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": unique_email, "password": "test123"})
    ok = check("ST-02: User Login / JWT Issued", r.status_code == 200, f"HTTP {r.status_code}")
    if ok:
        token = r.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
    else:
        # Fallback: login as existing citizen
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "citizen@example.com", "password": "test123"})
        if r.status_code == 200:
            token = r.json().get("access_token")
            session.headers.update({"Authorization": f"Bearer {token}"})

    # ── ST-03: /me profile ─────────────────────────────────────────
    r = session.get(f"{BASE_URL}/api/auth/me")
    check("ST-03: Authenticated /me Endpoint", r.status_code == 200 and "email" in r.json(), f"HTTP {r.status_code}")

    # ── ST-04: GET Issues list ────────────────────────────────────
    print("\n[ISSUES] Testing issue lifecycle...")
    r = session.get(f"{BASE_URL}/api/issues")
    check("ST-04: List Issues", r.status_code == 200, f"Returned {len(r.json()) if r.status_code==200 else 0} issues")

    # ── ST-05: Filter by category ─────────────────────────────────
    r = session.get(f"{BASE_URL}/api/issues?category=pothole")
    check("ST-05: Filter Issues by Category", r.status_code == 200)

    # ── ST-06: Filter by status ───────────────────────────────────
    r = session.get(f"{BASE_URL}/api/issues?status=open")
    check("ST-06: Filter Issues by Status", r.status_code == 200)

    # ── ST-07: Report a new Issue (form data) ────────────────────
    r = session.post(f"{BASE_URL}/api/issues", data={
        "title": "System Test Broken Streetlight",
        "description": "Light is out for 3 days on Main Rd.",
        "category": "streetlight",
        "severity": "medium",
        "latitude": 22.55,
        "longitude": 88.35,
    })
    check("ST-07: Report New Issue", r.status_code in (200, 201), f"HTTP {r.status_code}")
    issue_id = r.json().get("id") if r.status_code in (200, 201) else None

    # ── ST-08: Fetch Issue by ID ──────────────────────────────────
    if issue_id:
        r = session.get(f"{BASE_URL}/api/issues/{issue_id}")
        check("ST-08: Fetch Issue by ID", r.status_code == 200 and str(r.json().get("id")) == str(issue_id), f"HTTP {r.status_code}")

    # ── ST-09: Vote on a seeded Issue (different reporter) ────────
    print("\n[INTERACTIONS] Testing voting & comments...")
    # Get a seeded issue (reported by another user) to avoid self-vote restriction
    all_issues = session.get(f"{BASE_URL}/api/issues").json()
    votable = next((i for i in all_issues if i.get("title","").startswith("System Test") is False), None)
    vote_issue_id = votable["id"] if votable else issue_id
    if vote_issue_id:
        r = session.post(f"{BASE_URL}/api/issues/{vote_issue_id}/vote", json={"type": "upvote"})
        check("ST-09: Upvote Issue", r.status_code == 200, f"HTTP {r.status_code}")

        # ── ST-10: Duplicate Vote Rejected ────────────────────────
        r = session.post(f"{BASE_URL}/api/issues/{vote_issue_id}/vote", json={"type": "upvote"})
        check("ST-10: Duplicate Vote Rejected (409)", r.status_code == 409, f"HTTP {r.status_code}")

        # ── ST-11: Post a Comment ─────────────────────────────────
        r = session.post(f"{BASE_URL}/api/issues/{issue_id}/comments", json={"body": "System test comment — all good!"})
        check("ST-11: Post Comment", r.status_code in (200, 201), f"HTTP {r.status_code}")

        # ── ST-12: Fetch Comments ─────────────────────────────────
        r = session.get(f"{BASE_URL}/api/issues/{issue_id}/comments")
        check("ST-12: Fetch Comments for Issue", r.status_code == 200, f"HTTP {r.status_code}")

    # ── ST-13: Insights / Analytics ──────────────────────────────
    print("\n[ANALYTICS] Testing analytics & insights endpoints...")
    r = session.get(f"{BASE_URL}/api/insights/stats")
    check("ST-13: Dashboard Stats (/api/insights/stats)", r.status_code == 200 and "total_issues" in r.json(), f"HTTP {r.status_code}")

    r = session.get(f"{BASE_URL}/api/insights/heatmap")
    check("ST-14: Heatmap Data", r.status_code == 200, f"HTTP {r.status_code}")

    r = session.get(f"{BASE_URL}/api/insights/predictions")
    check("ST-15: Predictions Data", r.status_code == 200, f"HTTP {r.status_code}")

    r = session.get(f"{BASE_URL}/api/insights/area?name=Salt+Lake")
    check("ST-16: Area Insights", r.status_code == 200, f"HTTP {r.status_code}")
    
    r = session.get(f"{BASE_URL}/api/insights/forecast")
    check("ST-16b: Volume Forecast", r.status_code == 200, f"HTTP {r.status_code}")

    r = session.get(f"{BASE_URL}/api/insights/leaderboard")
    check("ST-17: Leaderboard", r.status_code == 200, f"HTTP {r.status_code}")

    # ── ST-18: Notifications ──────────────────────────────────────
    print("\n[NOTIFICATIONS] Testing notifications...")
    r = session.get(f"{BASE_URL}/api/notifications")
    check("ST-18: Fetch Notifications", r.status_code == 200, f"HTTP {r.status_code}")

    if issue_id:
        r = session.post(f"{BASE_URL}/api/notifications/issues/{issue_id}/subscribe")
        check("ST-19: Subscribe to Issue Updates", r.status_code in (200, 201), f"HTTP {r.status_code}")

    # ── ST-20: Security — Unauthenticated access denied ──────────
    print("\n[SECURITY] Testing authorization boundaries...")
    anon = requests.Session()
    r = anon.get(f"{BASE_URL}/api/auth/me")
    check("ST-20: Unauthenticated /me Rejected (401)", r.status_code == 401, f"HTTP {r.status_code}")

    r = anon.post(f"{BASE_URL}/api/issues", data={"title":"hack","latitude":0,"longitude":0})
    check("ST-21: Unauthenticated Issue Report Rejected (401)", r.status_code == 401, f"HTTP {r.status_code}")

    # ── Teardown ──────────────────────────────────────────────────
    backend_proc.terminate()
    backend_proc.wait()

    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    failed_tests = [name for name, ok in results if not ok]

    print()
    print("=" * 60)
    print(f"  SYSTEM TEST RESULTS: {passed}/{total} PASSED")
    print("=" * 60)
    if failed_tests:
        print("  FAILED TESTS:")
        for t in failed_tests:
            print(f"   ❌ {t}")
        print()
    else:
        print("  All system tests passed! Application is stable.")
    print("=" * 60)
    sys.exit(0 if not failed_tests else 1)

if __name__ == "__main__":
    test_system()
