# Community Hero (Nagrik)

**Community Hero** is an AI-powered full-stack civic issue reporting platform. It bridges the gap between citizens and local authorities by allowing users to report issues (like potholes, broken streetlights) and track their resolution.

## Features
- **AI Triage & Categorization:** Automatically assigns category tags and generates AI summaries of issues using Google Gemini.
- **Severity Prediction:** A Random Forest machine learning model predicts the severity of new issues based on historical trends, time, category, and text patterns.
- **Sentiment Analysis (Community Pulse):** Uses NLP (VADER) to gauge the urgency and sentiment of user comments, displaying a live neighborhood mood dashboard.
- **Volume Forecasting:** Uses Scikit-Learn Linear Regression to forecast civic issue volume for the upcoming weeks.
- **Duplicate Detection:** TF-IDF text vectorization prevents duplicate reports by comparing similarities among nearby issues.
- **Automated AI Digests:** Generates a weekly civic progress report via Gemini Flash.

## Tech Stack
- **Frontend:** Vanilla JS, HTML, CSS, Chart.js, Tailwind CSS (via CDN), Leaflet (Maps).
- **Backend:** FastAPI (Python), SQLite/PostgreSQL, SQLAlchemy.
- **Machine Learning:** Scikit-Learn, NLTK (VADER), Joblib.
- **Generative AI:** Google Gemini API.
