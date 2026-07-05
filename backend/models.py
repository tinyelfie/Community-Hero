import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Float, Integer, Boolean,
    ForeignKey, DateTime, Enum as SAEnum, UniqueConstraint, Uuid
)
from sqlalchemy.orm import relationship
from database import Base
import enum


# ---------- Enums ----------

class UserRole(str, enum.Enum):
    citizen = "citizen"
    moderator = "moderator"
    admin = "admin"


class IssueCategory(str, enum.Enum):
    pothole = "pothole"
    streetlight = "streetlight"
    water_leak = "water_leak"
    waste = "waste"
    drainage = "drainage"
    fallen_tree = "fallen_tree"
    broken_sidewalk = "broken_sidewalk"
    stray_animal = "stray_animal"
    illegal_parking = "illegal_parking"
    vandalism = "vandalism"
    other = "other"


class IssueSeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class IssueStatus(str, enum.Enum):
    open = "open"
    verified = "verified"
    in_progress = "in_progress"
    resolved = "resolved"
    rejected = "rejected"


class VoteType(str, enum.Enum):
    upvote = "upvote"
    verify = "verify"


class PerceivedSeverity(str, enum.Enum):
    mild = "mild"
    moderate = "moderate"
    severe = "severe"


# ---------- Models ----------

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.citizen)
    points = Column(Integer, nullable=False, default=0)
    is_verified_reporter = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    issues = relationship("Issue", foreign_keys="Issue.reported_by", back_populates="reporter")
    votes = relationship("Vote", back_populates="user")
    comments = relationship("Comment", back_populates="user")


class Issue(Base):
    __tablename__ = "issues"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, default="other")
    severity = Column(SAEnum(IssueSeverity), nullable=False, default=IssueSeverity.low)
    status = Column(SAEnum(IssueStatus), nullable=False, default=IssueStatus.open)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=True)
    image_url = Column(String(500), nullable=True)
    description_sentiment = Column(Float, nullable=True)
    urgency_level = Column(String(50), nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_tags = Column(String(200), nullable=True)
    ai_resolution_suggestion = Column(Text, nullable=True)
    resolution_image_url = Column(String(500), nullable=True)
    vote_count = Column(Integer, nullable=False, default=0)
    is_escalated = Column(Boolean, nullable=False, default=False)
    estimated_cost_min = Column(Integer, nullable=True)
    estimated_cost_max = Column(Integer, nullable=True)
    needs_review = Column(Boolean, nullable=False, default=False)
    rf_prediction = Column(String(20), nullable=True)
    gemini_prediction = Column(String(20), nullable=True)
    prediction_method = Column(String(50), nullable=True)
    rf_confidence = Column(Float, nullable=True)
    reported_by = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_to = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    status_changed_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    reporter = relationship("User", foreign_keys=[reported_by], back_populates="issues")
    assignee = relationship("User", foreign_keys=[assigned_to])
    votes = relationship("Vote", back_populates="issue", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="issue", cascade="all, delete-orphan", order_by="Comment.created_at")


class Vote(Base):
    __tablename__ = "votes"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    issue_id = Column(Uuid(as_uuid=True), ForeignKey("issues.id"), nullable=False)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(SAEnum(VoteType), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("issue_id", "user_id", "type", name="uq_vote_issue_user_type"),
    )

    # Relationships
    issue = relationship("Issue", back_populates="votes")
    user = relationship("User", back_populates="votes")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    issue_id = Column(Uuid(as_uuid=True), ForeignKey("issues.id"), nullable=False)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True)
    body = Column(Text, nullable=False)
    sentiment_score = Column(Float, nullable=True)
    is_authority_update = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    issue = relationship("Issue", back_populates="comments")
    user = relationship("User", back_populates="comments")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    issue_id = Column(Uuid(as_uuid=True), ForeignKey("issues.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "issue_id", name="uq_sub_user_issue"),
    )

    user = relationship("User", backref="subscriptions")
    issue = relationship("Issue", backref="subscribers")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    issue_id = Column(Uuid(as_uuid=True), ForeignKey("issues.id"), nullable=True)
    message = Column(String(500), nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", backref="notifications")
    issue = relationship("Issue", backref="notifications")


class Digest(Base):
    __tablename__ = "digests"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    generated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    content = Column(Text, nullable=False)
    week_start = Column(DateTime, nullable=False)
    week_end = Column(DateTime, nullable=False)

class MicroVerification(Base):
    __tablename__ = "micro_verifications"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    issue_id = Column(Uuid(as_uuid=True), ForeignKey("issues.id"), nullable=False)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    photo_visible = Column(Boolean, nullable=False)
    location_accurate = Column(Boolean, nullable=False)
    perceived_severity = Column(SAEnum(PerceivedSeverity), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("issue_id", "user_id", name="uq_micro_verify_issue_user"),
    )

    issue = relationship("Issue", backref="micro_verifications")
    user = relationship("User", backref="micro_verifications")

class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    area_name = Column(String(100), nullable=False)
    week_number = Column(Integer, nullable=False)
    predicted_count = Column(Integer, nullable=False)
    confidence_low = Column(Integer, nullable=False)
    confidence_high = Column(Integer, nullable=False)
    trend = Column(String(20), nullable=False)
    r_squared = Column(Float, nullable=False)
    generated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
