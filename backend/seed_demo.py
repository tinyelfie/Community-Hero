import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from routers.admin_routes import seed_demo_data

def seed():
    print("Starting seeding process...")
    db = SessionLocal()
    try:
        result = seed_demo_data(db)
        print(result["message"])
    except Exception as e:
        print(f"Error during seeding: {e}")
    finally:
        db.close()
    
if __name__ == "__main__":
    seed()
