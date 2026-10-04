from typing import List, Optional
from pydantic import BaseModel

class DetectionItem(BaseModel):
    category: str
    confidence: float  # Percentage 0-100
    source: Optional[str] = "AI model prediction"
    bbox: Optional[List[float]] = None  # Normalized [x_min, y_min, x_max, y_max]

class FrontendInterventionAnalysisRequest(BaseModel):
    photo_id: str

class FrontendInterventionAnalysisResponse(BaseModel):
    photo_id: str
    status: str  # "completed", "uncertain", "failed"
    model: str = "YOLOv8-Watershed-v1.0"
    processed_at: str
    detections: List[DetectionItem]

class EvidenceScoreBreakdown(BaseModel):
    gps_quality: float
    temporal_alignment: float
    satellite_suitability: float
    image_analysis_quality: float

class EvidenceAssessmentResult(BaseModel):
    site_id: str
    overall_score: float  # 0 to 100
    breakdown: EvidenceScoreBreakdown
    explanation: str
