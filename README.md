# Nagrik

> AI-powered civic issue reporting and analytics for Indian cities.

Citizens report broken streetlights, potholes, and waste. The community validates. Authorities act. AI handles the analysis.

---

## What It Does

- 📸 **Report** civic issues with photo + GPS — AI auto-classifies and summarizes
- 🗳️ **Vote & verify** issues to surface the most critical ones
- 🗺️ **Interactive map** with heatmap, clustering, and predictive hotspots
- 📊 **Analytics dashboard** with animated charts and KPI cards
- 🚗 **Authority route optimizer** for efficient field inspections
- 🏆 **Gamification** — points, badges, verified reporter status

---

## Stack

`FastAPI` · `SQLite` · `Google Gemini AI` · `Leaflet.js` · `Chart.js` · `Vanilla JS SPA`

---

## Quick Start

```bash
cd backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
python seed_demo.py
uvicorn main:app --port 8000
```

```bash
# New terminal
cd frontend
python -m http.server 5500
```

Open **http://localhost:5500** · Login: `citizen@example.com` / `test123`

→ See [how_to_run.md](how_to_run.md) for full setup instructions.  
→ See [technical_report.md](technical_report.md) for architecture and design decisions.  
→ See [description.md](description.md) for the full file structure and reading guide.
