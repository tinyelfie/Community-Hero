from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from database import get_db
import models, schemas, auth

router = APIRouter()


@router.post("/{issue_id}/vote", response_model=dict)
def vote_on_issue(
    issue_id: str,
    body: schemas.VoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Cast an upvote or verify vote on an issue.
    - Each user can upvote AND verify, but not double-vote on the same type.
    - At 5 verify votes, issue auto-promotes to 'verified'.
    - Voter earns +5 points.
    """
    import uuid
    try:
        issue_uuid = uuid.UUID(issue_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    issue = db.query(models.Issue).filter(models.Issue.id == issue_uuid).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Cannot vote on your own issue
    if str(issue.reported_by) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot vote on your own issue")

    # Check for existing vote of this type
    existing = db.query(models.Vote).filter(
        models.Vote.issue_id == issue_uuid,
        models.Vote.user_id == current_user.id,
        models.Vote.type == body.type,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already voted with this type")

    # Create the vote
    vote = models.Vote(
        issue_id=issue.id,
        user_id=current_user.id,
        type=body.type,
    )
    db.add(vote)

    # Increment denormalized vote count
    issue.vote_count += 1
    issue.updated_at = datetime.utcnow()

    # Award points to voter
    current_user.points += 5

    db.flush()

    # Auto-promote to verified if 5 verify votes reached
    if body.type == models.VoteType.verify:
        verify_count = db.query(models.Vote).filter(
            models.Vote.issue_id == issue_uuid,
            models.Vote.type == models.VoteType.verify,
        ).count()
        if verify_count >= 5 and issue.status == models.IssueStatus.open:
            issue.status = models.IssueStatus.verified

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Vote already recorded")

    db.refresh(issue)
    return {
        "vote_count": issue.vote_count,
        "status": issue.status.value,
        "points_earned": 5,
    }


@router.delete("/{issue_id}/vote", response_model=dict)
def remove_vote(
    issue_id: str,
    vote_type: str = "upvote",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Remove a previously cast vote."""
    import uuid
    try:
        issue_uuid = uuid.UUID(issue_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    issue = db.query(models.Issue).filter(models.Issue.id == issue_uuid).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    try:
        vt = models.VoteType(vote_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid vote type")

    vote = db.query(models.Vote).filter(
        models.Vote.issue_id == issue_uuid,
        models.Vote.user_id == current_user.id,
        models.Vote.type == vt,
    ).first()

    if not vote:
        raise HTTPException(status_code=404, detail="Vote not found")

    db.delete(vote)
    issue.vote_count = max(0, issue.vote_count - 1)
    issue.updated_at = datetime.utcnow()
    db.commit()

    return {"vote_count": issue.vote_count}
