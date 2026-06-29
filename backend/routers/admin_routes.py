from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models
from datetime import datetime, timedelta
import random

router = APIRouter()

@router.post("/seed-demo")
def seed_demo_data(db: Session = Depends(get_db)):
    """
    Seeds the database with generated data using seed.py logic.
    """
    import seed
    seed.seed()
    return {"message": "Demo data successfully seeded using credentials."}
