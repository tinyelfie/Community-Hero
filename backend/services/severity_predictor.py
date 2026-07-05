import os
import joblib
import json
from datetime import datetime
from sqlalchemy.orm import Session
from models import Issue, IssueStatus

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    analyzer = SentimentIntensityAnalyzer()
    def get_sentiment(text):
        if not text:
            return 0.0
        return analyzer.polarity_scores(text)['compound']
except ImportError:
    def get_sentiment(text):
        # Stub fallback if vaderSentiment is not installed
        if not text: return 0.0
        t = text.lower()
        if "dangerous" in t or "urgent" in t or "severe" in t:
            return -0.7
        if "fixed" in t or "good" in t or "thanks" in t:
            return 0.5
        return 0.0

def predict_severity(
    issue_data: dict, 
    db: Session, 
    model, 
    feature_names: list
) -> dict:
    if model is None or not feature_names:
        return {"predicted_severity": None, "confidence": 0.0, "method": "none", "feature_importances_used": False}
    
    cat_map = {"pothole": 0, "water_leak": 1, "streetlight": 2, "waste": 3, "drainage": 4, "other": 5}
    
    # Extract features
    category_encoded = cat_map.get(issue_data.get("category"), 5)
    vote_count = issue_data.get("vote_count", 0)
    
    created_at = issue_data.get("created_at", datetime.utcnow())
    hour_of_day = created_at.hour
    day_of_week = created_at.weekday()
    
    desc = issue_data.get("description", "")
    description_length = len(desc) if desc else 0
    sentiment_score = get_sentiment(desc)
    
    report_age_days = (datetime.utcnow() - created_at).days if created_at else 0
    
    # Area avg severity query
    address = issue_data.get("address", "")
    neighborhood = address.split(",")[0].strip() if address else ""
    
    area_avg = 1.0 # default medium
    if neighborhood:
        past_issues = db.query(Issue.severity).filter(
            Issue.address.ilike(f"%{neighborhood}%"),
            Issue.status == IssueStatus.resolved
        ).all()
        
        sev_map = {"low": 0, "medium": 1, "high": 2, "critical": 3}
        if past_issues:
            total = sum([sev_map.get(str(i[0].value) if i[0] else "medium", 1) for i in past_issues])
            area_avg = total / len(past_issues)
            
    # Assemble feature vector based on feature_names
    feature_dict = {
        "category_encoded": category_encoded,
        "vote_count": vote_count,
        "hour_of_day": hour_of_day,
        "day_of_week": day_of_week,
        "description_length": description_length,
        "area_avg_severity": area_avg,
        "sentiment_score": sentiment_score,
        "report_age_days": report_age_days
    }
    
    # Ensure correct order
    feature_vector = [[feature_dict.get(fn, 0) for fn in feature_names]]
    
    # Predict
    pred_int = model.predict(feature_vector)[0]
    probas = model.predict_proba(feature_vector)[0]
    
    confidence = float(max(probas))
    
    rev_map = {0: "low", 1: "medium", 2: "high", 3: "critical"}
    predicted_severity = rev_map.get(pred_int, "medium")
    
    return {
        "predicted_severity": predicted_severity,
        "confidence": confidence,
        "feature_importances_used": True,
        "method": "random_forest"
    }
