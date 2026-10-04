from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter
from app.core.exceptions import create_success_response
from app.schemas.analysis import FrontendInterventionAnalysisRequest, FrontendInterventionAnalysisResponse
from app.services.ai_detection_service import run_intervention_detection
from app.services.evidence_service import calculate_evidence_score
from app.services.satellite_service import calculate_ndvi, calculate_ndwi

router = APIRouter(tags=["AI & Environmental Analysis"])

# Frontend Integration API Contract Endpoint
@router.post("/analyses/interventions")
def analyze_intervention_contract(payload: FrontendInterventionAnalysisRequest) -> Dict[str, Any]:
    result = run_intervention_detection(payload.photo_id)
    result["processed_at"] = datetime.now(timezone.utc).isoformat()
    return result

@router.post("/images/{image_id}/analyze")
def start_image_analysis(image_id: str):
    result = run_intervention_detection(image_id)
    result["processed_at"] = datetime.now(timezone.utc).isoformat()
    return create_success_response(data=result, message="Image analysis completed")

@router.get("/images/{image_id}/analysis")
def get_image_analysis_results(image_id: str):
    result = run_intervention_detection(image_id)
    result["processed_at"] = datetime.now(timezone.utc).isoformat()
    return create_success_response(data=result)

@router.post("/analysis/ndvi")
def compute_ndvi(nir: float = 0.6, red: float = 0.2):
    val = calculate_ndvi(nir, red)
    return create_success_response(data={"index": "NDVI", "formula": "(NIR - Red) / (NIR + Red)", "val": val})

@router.post("/analysis/ndwi")
def compute_ndwi(green: float = 0.5, nir: float = 0.2):
    val = calculate_ndwi(green, nir)
    return create_success_response(data={"index": "NDWI", "formula": "(Green - NIR) / (Green + NIR)", "val": val})

@router.post("/evidence/assess")
def assess_evidence(site_id: str = "barmer"):
    result = calculate_evidence_score()
    result["site_id"] = site_id
    return create_success_response(data=result)

@router.get("/sites/{site_id}/evidence")
def get_site_evidence(site_id: str):
    result = calculate_evidence_score()
    result["site_id"] = site_id
    return create_success_response(data=result)
