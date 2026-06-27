# Community Hero

**Community Hero** is a modern civic issue reporting and analytics platform. It empowers citizens to report local infrastructure issues (like potholes, streetlights, and waste), validates them via community upvotes, and provides a routing dashboard for government authorities.

## Getting Started
Please refer to `technical_report.md` for a comprehensive architectural study guide.

### Prerequisites
- Python 3.10+
- PostgreSQL (via Docker)

### Running Locally
```bash
# Start backend
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --port 8000

# Start frontend
cd frontend
python -m http.server 3000
```
Open `http://localhost:3000` in your browser.
