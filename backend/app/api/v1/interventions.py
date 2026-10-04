from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.intervention import Intervention
from app.core.exceptions import create_success_response, create_error_response

router = APIRouter(prefix="/interventions", tags=["Interventions"])

def _serialize_intervention(s: Intervention):
    return {
        "id": s.id,
        "name": s.name,
        "district": s.district,
        "kind": s.kind,
        "status": s.status,
        "score": s.score,
        "reason": s.reason or "",
        "coordinates": [s.longitude, s.latitude],
        "photo": s.photo_url or "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=560&q=82"
    }

@router.get("")
def list_interventions(db: Session = Depends(get_db)):
    interventions = db.query(Intervention).all()
    return create_success_response(data=[_serialize_intervention(s) for s in interventions])

@router.get("/{intervention_id}")
def get_intervention(intervention_id: str, db: Session = Depends(get_db)):
    site = db.query(Intervention).filter_by(id=intervention_id).first()
    if not site:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Intervention site not found")
    return create_success_response(data=_serialize_intervention(site))

@router.get("/{intervention_id}/images")
def get_intervention_images(intervention_id: str, db: Session = Depends(get_db)):
    site = db.query(Intervention).filter_by(id=intervention_id).first()
    if not site:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Intervention site not found")
    return create_success_response(data=[{"id": f"img-{intervention_id}", "photo_url": site.photo_url, "captured_at": "2026-03-15T10:00:00Z"}])
