import numpy as np
from sklearn.linear_model import LinearRegression
from collections import defaultdict
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from models import Issue, Forecast
import logging

logger = logging.getLogger(__name__)

def generate_forecasts(db: Session):
    """
    Fetches the last 26 weeks of data, builds a linear regression model per area,
    and updates the forecasts table.
    """
    now = datetime.utcnow()
    # Go back 26 weeks (182 days)
    start_date = now - timedelta(weeks=26)
    
    # 1. Fetch raw data
    issues = db.query(Issue.address, Issue.created_at).filter(
        Issue.created_at >= start_date
    ).all()
    
    # 2. Group by Area and Week
    # We'll use relative week numbers (1 to 26)
    # week = (issue.created_at - start_date).days // 7 + 1
    
    weekly_counts = defaultdict(lambda: defaultdict(int))
    for issue in issues:
        if not issue.address:
            continue
        area = issue.address.split(',')[0].strip()
        week_num = (issue.created_at - start_date).days // 7 + 1
        # Cap week_num at 26 just in case
        week_num = min(week_num, 26)
        weekly_counts[area][week_num] += 1
        
    # 3. For each area, fit LR and predict
    # Delete old forecasts first
    db.query(Forecast).delete()
    
    areas_processed = 0
    
    for area, weeks in weekly_counts.items():
        # Ensure we have data for all 26 weeks (fill 0)
        X = []
        Y = []
        counts_for_history = []
        for w in range(1, 27):
            X.append([w])
            count = weeks.get(w, 0)
            Y.append(count)
            counts_for_history.append(count)
            
        X_arr = np.array(X)
        Y_arr = np.array(Y)
        
        # Fit Linear Regression
        model = LinearRegression()
        model.fit(X_arr, Y_arr)
        
        r_squared = model.score(X_arr, Y_arr)
        
        # Calculate residuals for confidence intervals
        predictions_train = model.predict(X_arr)
        residuals = Y_arr - predictions_train
        residual_std = np.std(residuals)
        
        # Predict Week 27 and 28
        X_pred = np.array([[27], [28]])
        preds = model.predict(X_pred)
        
        for idx, week_offset in enumerate([27, 28]):
            # 80% confidence interval uses 1.28 * std
            margin = 1.28 * residual_std
            pred_count = max(0, int(round(preds[idx])))
            
            conf_low = max(0, int(round(preds[idx] - margin)))
            conf_high = int(round(preds[idx] + margin))
            
            # Apply ceiling logic to prevent explosive growth
            max_hist = max(Y_arr) if len(Y_arr) > 0 else 0
            conf_high = min(conf_high, int(max_hist * 1.5) + 2)
            
            # Determine trend based on Week 27 vs Week 26
            trend = "stable"
            if idx == 0:  # Week 27 comparison
                actual_w26 = Y_arr[-1]
                if actual_w26 > 0:
                    pct_change = ((pred_count - actual_w26) / actual_w26) * 100
                    if pct_change > 15:
                        trend = "rising"
                    elif pct_change > 5:
                        trend = "increasing"
                    elif pct_change < -5:
                        trend = "declining"
                else:
                    if pred_count > 0:
                        trend = "rising"
            
            forecast = Forecast(
                area_name=area,
                week_number=week_offset,
                predicted_count=pred_count,
                confidence_low=conf_low,
                confidence_high=conf_high,
                trend=trend,
                r_squared=r_squared
            )
            db.add(forecast)
            
        areas_processed += 1

    db.commit()
    logger.info(f"Generated forecasts for {areas_processed} areas.")
