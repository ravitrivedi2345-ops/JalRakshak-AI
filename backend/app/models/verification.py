import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from app.db.session import Base

class VerificationTaskModel(Base):
    __tablename__ = "verification_tasks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    site_id = Column(String, ForeignKey("interventions.id"), nullable=False)
    officer = Column(String, nullable=False, default="Ravi Trivedi")
    due_date = Column(String, nullable=False)
    status = Column(String, nullable=False, default="assigned")  # "pending", "assigned", "in_progress", "submitted", "verified", "rejected"
    observation = Column(Text, nullable=True, default="")
    attachments_json = Column(Text, nullable=False, default="[]")
    history_json = Column(Text, nullable=False, default="[]")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
