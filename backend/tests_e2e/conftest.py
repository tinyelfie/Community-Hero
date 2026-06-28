import pytest
import subprocess
import time
import os
import requests

@pytest.fixture(scope="session", autouse=True)
def start_servers():
    # Start backend
    backend_env = os.environ.copy()
    backend_env["DATABASE_URL"] = "sqlite:///./e2e_test.db"
    
    if os.path.exists("e2e_test.db"):
        os.remove("e2e_test.db")
        
    # Run seed script for the test database
    subprocess.run(
        ["python", "-X", "utf8", "seed.py"],
        cwd=os.path.join(os.path.dirname(__file__), ".."),
        env=backend_env
    )
        
    backend_process = subprocess.Popen(
        ["python", "-m", "uvicorn", "main:app", "--port", "8000"],
        cwd=os.path.join(os.path.dirname(__file__), ".."),
        env=backend_env
    )
    
    # Start frontend with fixed MIME types for Windows
    frontend_process = subprocess.Popen(
        ["python", "-c", "import http.server, socketserver, mimetypes; mimetypes.add_type('application/javascript', '.js'); mimetypes.add_type('text/css', '.css'); socketserver.TCPServer(('127.0.0.1', 5500), http.server.SimpleHTTPRequestHandler).serve_forever()"],
        cwd=os.path.join(os.path.dirname(__file__), "..", "..", "frontend")
    )
    
    # Wait for backend
    for _ in range(15):
        try:
            resp = requests.get("http://localhost:8000/docs")
            if resp.status_code == 200:
                break
        except requests.exceptions.ConnectionError:
            time.sleep(1)
            
    # Wait for frontend
    for _ in range(15):
        try:
            resp = requests.get("http://127.0.0.1:5500/")
            if resp.status_code == 200:
                break
        except requests.exceptions.ConnectionError:
            time.sleep(1)
            
    time.sleep(1)
            
    yield
    
    backend_process.terminate()
    frontend_process.terminate()
    backend_process.wait()
    frontend_process.wait()
    if os.path.exists("e2e_test.db"):
        try:
            os.remove("e2e_test.db")
        except:
            pass
