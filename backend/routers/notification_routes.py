from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Issue, Subscription, Notification
from auth import get_current_user
from schemas import SubscriptionOut, NotificationOut
from typing import List
from uuid import UUID

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationOut])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).order_by(Notification.created_at.desc()).all()
    return notifications

@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"status": "success"}

@router.post("/issues/{issue_id}/subscribe")
def subscribe_to_issue(
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    existing = db.query(Subscription).filter(
        Subscription.user_id == current_user.id,
        Subscription.issue_id == issue_id
    ).first()
    
    if existing:
        return {"status": "already_subscribed"}
        
    sub = Subscription(user_id=current_user.id, issue_id=issue_id)
    db.add(sub)
    db.commit()
    return {"status": "subscribed"}

@router.post("/issues/{issue_id}/unsubscribe")
def unsubscribe_from_issue(
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Subscription).filter(
        Subscription.user_id == current_user.id,
        Subscription.issue_id == issue_id
    ).first()
    
    if existing:
        db.delete(existing)
        db.commit()
        
    return {"status": "unsubscribed"}
