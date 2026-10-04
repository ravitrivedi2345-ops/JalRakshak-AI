from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.intervention import Intervention
from app.models.watershed import Watershed
from app.core.exceptions import create_success_response

router = APIRouter(tags=["Search"])

@router.get("/search")
def search(q: str = "", db: Session = Depends(get_db)):
    query = q.lower().strip()
    if not query:
        interventions = db.query(Intervention).all()
        watersheds = db.query(Watershed).all()
    else:
        interventions = db.query(Intervention).filter(
            func.lower(Intervention.name).like(f"%{query}%") |
            func.lower(Intervention.district).like(f"%{query}%") |
            func.lower(Intervention.kind).like(f"%{query}%")
        ).all()

        watersheds = db.query(Watershed).filter(
            func.lower(Watershed.name).like(f"%{query}%") |
            func.lower(Watershed.district).like(f"%{query}%") |
            func.lower(Watershed.state).like(f"%{query}%")
        ).all()

    site_results = [
        {
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
        for s in interventions
    ]

    ws_results = [
        {"id": w.id, "name": w.name, "district": w.district, "state": w.state, "area_sq_km": w.area_sq_km}
        for w in watersheds
    ]

    return create_success_response(
        data={
            "query": q,
            "sites": site_results,
            "watersheds": ws_results
        }
    )
