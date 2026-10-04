import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text, Integer, ForeignKey
from app.db.session import Base

class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True, nullable=False)
    district = Column(String, index=True, nullable=False)
    kind = Column(String, index=True, nullable=False)  # "Check dam", "Farm pond", "Plantation", "Erosion risk"
    status = Column(String, default="Needs verification")  # "Needs verification", "Monitoring", "Verified"
    score = Column(Integer, default=75)
    reason = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    photo_url = Column(String, nullable=True)
    watershed_id = Column(String, ForeignKey("watersheds.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
