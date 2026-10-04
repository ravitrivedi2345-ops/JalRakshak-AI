import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
from app.db.session import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scope = Column(String, nullable=False, default="Watershed overview")
    period = Column(String, nullable=False, default="This season")
    file_path = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    status = Column(String, nullable=False, default="completed")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
