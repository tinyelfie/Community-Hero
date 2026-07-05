import csv
import random
import os

NUM_ROWS = 1000
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'ml_models', 'training_data.csv')

def get_label(category_encoded, vote_count, hour_of_day, area_avg_severity, sentiment_score):
    # Base defaults
    label = 0
    
    # Domain rules
    if category_encoded == 1: # water_leak
        if vote_count > 20:
            label = 3 if random.random() < 0.8 else 2
        elif vote_count < 5:
            label = 1 if random.random() < 0.6 else 0
        else:
            label = 2
    elif category_encoded == 0: # pothole
        if vote_count > 15 and sentiment_score < -0.5:
            label = 2 if random.random() < 0.7 else 3
        elif vote_count < 3:
            label = 0 if random.random() < 0.7 else 1
        else:
            label = 1
    elif category_encoded == 2: # streetlight
        if 18 <= hour_of_day <= 23 or 0 <= hour_of_day <= 5:
            label = 2 if random.random() < 0.6 else 1
        else:
            label = 0
    elif category_encoded == 3: # waste
        if area_avg_severity > 2.0:
            label = 2 if random.random() < 0.5 else 1
        else:
            label = 1
    else:
        label = 1
        
    # Global overrides
    if vote_count > 30:
        label = max(label, 2)
        
    if sentiment_score < -0.7:
        label = min(label + 1, 3)
        
    # Add 15% random noise
    if random.random() < 0.15:
        if random.random() < 0.5:
            label = min(label + 1, 3)
        else:
            label = max(label - 1, 0)
            
    return label

def generate_data():
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    with open(OUTPUT_FILE, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            'category_encoded', 'vote_count', 'hour_of_day', 'day_of_week',
            'description_length', 'area_avg_severity', 'sentiment_score',
            'report_age_days', 'severity_encoded'
        ])
        
        for _ in range(NUM_ROWS):
            category_encoded = random.randint(0, 5)
            # Right skewed distribution for votes
            vote_count = int(random.expovariate(1/5.0))
            vote_count = min(vote_count, 50)
            
            hour_of_day = random.randint(0, 23)
            day_of_week = random.randint(0, 6)
            description_length = random.randint(10, 500)
            area_avg_severity = round(random.uniform(0.0, 3.0), 2)
            sentiment_score = round(random.uniform(-1.0, 1.0), 2)
            report_age_days = random.randint(0, 100)
            
            label = get_label(category_encoded, vote_count, hour_of_day, area_avg_severity, sentiment_score)
            
            writer.writerow([
                category_encoded, vote_count, hour_of_day, day_of_week,
                description_length, area_avg_severity, sentiment_score,
                report_age_days, label
            ])

if __name__ == "__main__":
    generate_data()
    print(f"Generated {NUM_ROWS} rows of training data to {OUTPUT_FILE}")
