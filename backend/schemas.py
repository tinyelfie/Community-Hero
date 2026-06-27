from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from models import UserRole, IssueCategory, IssueSeverity, IssueStatus, VoteType


# ---------- Auth Schemas ----------

class UserRegister(BaseModel):
    name: str
    email: str
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: UUID
    name: str
    email: str
    role: UserRole
    points: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Issue Schemas ----------

class IssueCreate(BaseModel):
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    category: Optional[IssueCategory] = IssueCategory.other
    severity: Optional[IssueSeverity] = IssueSeverity.low


class IssueStatusUpdate(BaseModel):
    status: IssueStatus


class CommentOut(BaseModel):
    id: UUID
    body: str
    is_authority_update: bool
    created_at: datetime
    user: UserOut

    model_config = {"from_attributes": True}


class IssueOut(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    category: IssueCategory
    severity: IssueSeverity
    status: IssueStatus
    latitude: float
    longitude: float
    address: Optional[str]
    image_url: Optional[str]
    ai_summary: Optional[str]
    ai_tags: Optional[str]
    vote_count: int
    reported_by: UUID
    reporter: Optional[UserOut] = None
    assignee: Optional[UserOut] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IssueDetail(IssueOut):
    comments: List[CommentOut] = []


# ---------- Vote Schemas ----------

class VoteCreate(BaseModel):
    type: VoteType


class VoteOut(BaseModel):
    id: UUID
    issue_id: UUID
    user_id: UUID
    type: VoteType
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------- Comment Schemas ----------

class CommentCreate(BaseModel):
    body: str
    is_authority_update: Optional[bool] = False


# ---------- Analytics Schemas ----------

class StatsOut(BaseModel):
    total_issues: int
    open_issues: int
    resolved_issues: int
    resolution_rate: float
    issues_by_category: dict
    monthly_trend: List[dict]


class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    weight: int


class PredictionPoint(BaseModel):
    lat: float
    lng: float
    intensity: int
    predicted_count: int


# ---------- Profile Schemas ----------

class BadgeOut(BaseModel):
    id: str
    name: str
    icon: str
    description: str
    earned: bool


class ProfileOut(BaseModel):
    user: UserOut
    badges: List[BadgeOut]
    reported_issues: List[IssueOut]
    total_reported: int
    verify_votes: int
    resolved_by_user: int



# ---------- Notification Schemas ----------

class SubscriptionOut(BaseModel):
    id: UUID
    user_id: UUID
    issue_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationOut(BaseModel):
    id: UUID
    user_id: UUID
    issue_id: Optional[UUID]
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
