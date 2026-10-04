import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey
from app.db.session import Base

class FieldImage(Base):
    __tablename__ = "field_images"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    status = Column(String, default="uploaded")  # "uploaded", "processing", "analyzed"
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    gps_source = Column(String, default="none")  # "exif", "manual", "device", "none"
    captured_at = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    site_id = Column(String, ForeignKey("interventions.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
