import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey
from app.db.session import Base

class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    image_id = Column(String, ForeignKey("field_images.id"), nullable=False)
    status = Column(String, default="completed")  # "completed", "uncertain", "failed"
    model_version = Column(String, default="YOLOv8-Watershed-v1.0")
    detections_json = Column(Text, nullable=False, default="[]")
    processed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class EvidenceAssessment(Base):
    __tablename__ = "evidence_assessments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    site_id = Column(String, ForeignKey("interventions.id"), nullable=False)
    overall_score = Column(Float, nullable=False)
    gps_quality = Column(Float, nullable=False)
    temporal_alignment = Column(Float, nullable=False)
    satellite_suitability = Column(Float, nullable=False)
    image_analysis_quality = Column(Float, nullable=False)
    explanation = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
