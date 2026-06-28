from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Issue, IssueStatus
from auth import get_current_user
from typing import List, Optional
import math
from pydantic import BaseModel

router = APIRouter(prefix="/api/authority", tags=["Authority"])

class OptimizeRequest(BaseModel):
    category: Optional[str] = None
    start_lat: float
    start_lng: float

def distance(lat1, lon1, lat2, lon2):
    # Haversine distance
    R = 6371 # km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)
    a = math.sin(dLat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dLon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

@router.post("/optimize-route")
def optimize_route(
    req: OptimizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ("moderator", "admin"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
        
    query = db.query(Issue).filter(Issue.status.in_([IssueStatus.open, IssueStatus.verified, IssueStatus.in_progress]))
    if req.category:
        query = query.filter(Issue.category == req.category)
        
    issues = query.all()
    if not issues:
        return {"route": []}
        
    # Nearest Neighbor Algorithm
    unvisited = issues.copy()
    current_lat = req.start_lat
    current_lng = req.start_lng
    
    route = []
    
    while unvisited:
        if len(route) >= 15:
            break
            
        nearest = None
        min_dist = float('inf')
        for issue in unvisited:
            dist = distance(current_lat, current_lng, issue.latitude, issue.longitude)
            if dist < min_dist:
                min_dist = dist
                nearest = issue
                
        route.append({
            "id": str(nearest.id),
            "title": nearest.title,
            "latitude": nearest.latitude,
            "longitude": nearest.longitude,
            "distance_km": round(min_dist, 2),
            "address": nearest.address
        })
        current_lat = nearest.latitude
        current_lng = nearest.longitude
        unvisited.remove(nearest)
        
    return {"route": route}
