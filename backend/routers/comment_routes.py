from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth

router = APIRouter()


@router.get("/{issue_id}/comments", response_model=List[schemas.CommentOut])
def get_comments(issue_id: str, db: Session = Depends(get_db)):
    """Get all comments for an issue, newest first."""
    import uuid
    try:
        issue_uuid = uuid.UUID(issue_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    issue = db.query(models.Issue).filter(models.Issue.id == issue_uuid).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    comments = (
        db.query(models.Comment)
        .filter(models.Comment.issue_id == issue_uuid)
        .order_by(models.Comment.created_at.desc())
        .all()
    )
    return [schemas.CommentOut.model_validate(c) for c in comments]


@router.post("/{issue_id}/comments", response_model=schemas.CommentOut, status_code=201)
def post_comment(
    issue_id: str,
    body: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Post a comment on an issue. Moderators/admins can mark as authority updates."""
    import uuid
    try:
        issue_uuid = uuid.UUID(issue_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    issue = db.query(models.Issue).filter(models.Issue.id == issue_uuid).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Only moderators/admins can post authority updates
    is_authority = body.is_authority_update and current_user.role.value in ("moderator", "admin")

    comment = models.Comment(
        issue_id=issue.id,
        user_id=current_user.id,
        body=body.body.strip(),
        is_authority_update=is_authority,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return schemas.CommentOut.model_validate(comment)
