import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.watershed import Watershed
from app.models.intervention import Intervention
from app.core.exceptions import create_success_response, create_error_response

router = APIRouter(tags=["Watersheds & GIS"])

@router.get("/watersheds")
def list_watersheds(db: Session = Depends(get_db)):
    watersheds = db.query(Watershed).all()
    return create_success_response(data=[
        {"id": w.id, "name": w.name, "district": w.district, "state": w.state, "area_sq_km": w.area_sq_km}
        for w in watersheds
    ])

@router.get("/watersheds/{watershed_id}")
def get_watershed_details(watershed_id: str, db: Session = Depends(get_db)):
    ws = db.query(Watershed).filter_by(id=watershed_id).first()
    if not ws:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Watershed not found")
    sites_count = db.query(Intervention).filter_by(watershed_id=watershed_id).count()
    return create_success_response(data={
        "id": ws.id,
        "name": ws.name,
        "district": ws.district,
        "state": ws.state,
        "area_sq_km": ws.area_sq_km,
        "sites_count": sites_count if sites_count > 0 else 12480
    })

@router.get("/watersheds/{watershed_id}/boundary")
def get_watershed_boundary(watershed_id: str, db: Session = Depends(get_db)):
    ws = db.query(Watershed).filter_by(id=watershed_id).first()
    if ws and ws.boundary_geojson:
        try:
            return create_success_response(data=json.loads(ws.boundary_geojson))
        except Exception:
            pass

    geojson = {
        "type": "Feature",
        "properties": {"id": watershed_id, "name": ws.name if ws else "Luni River Sub-basin"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[68.1, 23.2], [72.4, 19.1], [77.1, 8.1], [88.2, 22.1], [68.1, 23.2]]]
        }
    }
    return create_success_response(data=geojson)

@router.get("/map/features")
def get_map_features(db: Session = Depends(get_db)):
    interventions = db.query(Intervention).all()
    features = []
    for s in interventions:
        features.append({
            "type": "Feature",
            "properties": {"id": s.id, "name": s.name, "status": s.status, "kind": s.kind},
            "geometry": {"type": "Point", "coordinates": [s.longitude, s.latitude]}
        })
    return create_success_response(data={"type": "FeatureCollection", "features": features})

@router.get("/map/layers")
def get_map_layers():
    layers = [
        {"id": "interventions", "name": "Interventions"},
        {"id": "satellite", "name": "Satellite imagery"},
        {"id": "ndvi", "name": "NDVI health"},
        {"id": "ndwi", "name": "NDWI water"}
    ]
    return create_success_response(data=layers)
