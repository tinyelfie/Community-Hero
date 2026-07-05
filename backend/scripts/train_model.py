import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
import joblib
import json
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'ml_models', 'training_data.csv')
MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'ml_models')
MODEL_FILE = os.path.join(MODEL_DIR, 'severity_model.pkl')
IMPORTANCES_FILE = os.path.join(MODEL_DIR, 'feature_importances.json')
EVALUATION_FILE = os.path.join(MODEL_DIR, 'model_evaluation.txt')
FEATURES_FILE = os.path.join(MODEL_DIR, 'feature_names.json')

def train_and_evaluate():
    # Load data
    df = pd.read_csv(DATA_FILE)
    
    # Separate features and label
    X = df.drop(columns=['severity_encoded'])
    y = df['severity_encoded']
    
    feature_names = list(X.columns)
    
    # Train/test split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Initialize Random Forest
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        class_weight='balanced',
        random_state=42
    )
    
    # Train the model
    rf.fit(X_train, y_train)
    
    # Evaluate
    y_pred = rf.predict(X_test)
    report = classification_report(y_test, y_pred, target_names=["low", "medium", "high", "critical"])
    
    print("Classification Report:")
    print(report)
    
    # Save evaluation report
    with open(EVALUATION_FILE, 'w') as f:
        f.write("Random Forest Classification Report\n")
        f.write("===================================\n\n")
        f.write(report)
        
    # Extract and save feature importances
    importances = rf.feature_importances_
    importance_data = [{"feature": fn, "importance": float(imp)} for fn, imp in zip(feature_names, importances)]
    importance_data.sort(key=lambda x: x["importance"], reverse=True)
    
    with open(IMPORTANCES_FILE, 'w') as f:
        json.dump(importance_data, f, indent=4)
        
    # Save the feature names order
    with open(FEATURES_FILE, 'w') as f:
        json.dump(feature_names, f, indent=4)
        
    # Save the model
    joblib.dump(rf, MODEL_FILE)
    
    print(f"Model saved to {MODEL_FILE}")
    print(f"Feature importances saved to {IMPORTANCES_FILE}")
    print(f"Feature names saved to {FEATURES_FILE}")
    print(f"Evaluation report saved to {EVALUATION_FILE}")

if __name__ == "__main__":
    train_and_evaluate()
