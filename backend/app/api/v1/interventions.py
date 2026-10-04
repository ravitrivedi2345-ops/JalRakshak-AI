from fastapi import APIRouter
from app.core.exceptions import create_success_response, create_error_response
from app.api.v1.watersheds import SAMPLE_SITES

router = APIRouter(prefix="/interventions", tags=["Interventions"])

@router.get("")
def list_interventions():
    return create_success_response(data=SAMPLE_SITES)

@router.get("/{intervention_id}")
def get_intervention(intervention_id: str):
    site = next((s for s in SAMPLE_SITES if s["id"] == intervention_id), None)
    if not site:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Intervention site not found")
    return create_success_response(data=site)

@router.get("/{intervention_id}/images")
def get_intervention_images(intervention_id: str):
    site = next((s for s in SAMPLE_SITES if s["id"] == intervention_id), None)
    if not site:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Intervention site not found")
    return create_success_response(data=[{"id": f"img-{intervention_id}", "photo_url": site["photo"], "captured_at": "2026-03-15T10:00:00Z"}])
