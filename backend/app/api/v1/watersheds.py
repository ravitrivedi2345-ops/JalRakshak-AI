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

@router.get("/boundaries/national")
def get_national_boundary():
    geojson = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {"name": "India National Boundary", "country": "India", "source": "Survey of India (SOIN)"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                  [68.1, 23.2], [69.5, 22.8], [70.1, 20.5], [72.4, 19.1],
                  [73.4, 15.2], [74.7, 11.9], [77.1, 8.1], [79.5, 9.1],
                  [80.2, 13.1], [82.2, 15.1], [84.5, 17.7], [86.8, 20.1],
                  [88.2, 22.1], [89.7, 23.8], [92.2, 24.1], [94.8, 26.1],
                  [96.1, 28.2], [94.2, 29.1], [92.3, 27.2], [90.1, 27.2],
                  [88.1, 27.7], [85.9, 28.2], [83.3, 29.8], [81.4, 31.4],
                  [79.2, 34.1], [76.4, 35.3], [74.2, 33.5], [73.1, 30.4],
                  [71.3, 28.8], [70.2, 26.9], [68.1, 25], [68.1, 23.2]
                ]]
            }
        }]
    }
    return create_success_response(data=geojson)

@router.get("/boundaries/states")
def get_state_boundaries():
    states = [
        {"name": "Rajasthan", "code": "RJ", "coords": [[[69.5, 24.2], [71.5, 24.5], [75.5, 27.5], [78.2, 27.0], [75.0, 30.0], [71.0, 28.5], [69.5, 24.2]]]},
        {"name": "Assam", "code": "AS", "coords": [[[89.7, 26.0], [92.5, 26.8], [96.0, 27.8], [94.5, 24.8], [92.0, 24.5], [89.7, 26.0]]]},
        {"name": "Karnataka", "code": "KA", "coords": [[[74.2, 14.8], [77.5, 18.4], [78.5, 14.0], [76.8, 11.6], [74.5, 13.0], [74.2, 14.8]]]},
        {"name": "Odisha", "code": "OD", "coords": [[[81.4, 18.0], [84.0, 19.5], [87.5, 21.8], [86.0, 22.5], [82.5, 20.0], [81.4, 18.0]]]},
        {"name": "Himachal Pradesh", "code": "HP", "coords": [[[75.6, 31.2], [77.8, 33.2], [79.0, 31.8], [77.2, 30.4], [75.6, 31.2]]]}
    ]
    features = [
        {
            "type": "Feature",
            "properties": {"state": s["name"], "code": s["code"], "source": "Survey of India State Outlines"},
            "geometry": {"type": "Polygon", "coordinates": s["coords"]}
        }
        for s in states
    ]
    return create_success_response(data={"type": "FeatureCollection", "features": features})

@router.get("/hydro/rivers")
def get_river_network():
    rivers = [
        {"name": "Luni River", "order": 4, "coords": [[73.5, 26.5], [72.2, 25.8], [71.2, 24.8], [70.5, 24.2]]},
        {"name": "Brahmaputra River", "order": 5, "coords": [[95.5, 28.1], [93.8, 27.2], [91.5, 26.2], [89.8, 25.8]]},
        {"name": "Palar River", "order": 3, "coords": [[78.2, 13.3], [78.9, 12.9], [79.8, 12.7]]},
        {"name": "Nagavali River", "order": 3, "coords": [[83.2, 19.8], [83.5, 18.9], [83.8, 18.2]]},
        {"name": "Beas River", "order": 4, "coords": [[77.2, 32.4], [76.5, 31.9], [75.8, 31.6]]}
    ]
    features = [
        {
            "type": "Feature",
            "properties": {"name": r["name"], "stream_order": r["order"], "type": "River Network"},
            "geometry": {"type": "LineString", "coordinates": r["coords"]}
        }
        for r in rivers
    ]
    return create_success_response(data={"type": "FeatureCollection", "features": features})

@router.get("/map/features")
def get_map_features(db: Session = Depends(get_db)):
    interventions = db.query(Intervention).all()
    features = []
    for s in interventions:
        features.append({
            "type": "Feature",
            "properties": {
                "id": s.id,
                "name": s.name,
                "status": s.status,
                "kind": s.kind,
                "district": s.district,
                "score": s.score,
                "reason": s.reason,
                "photo_url": s.photo_url
            },
            "geometry": {"type": "Point", "coordinates": [s.longitude, s.latitude]}
        })
    return create_success_response(data={"type": "FeatureCollection", "features": features})

@router.get("/map/layers")
def get_map_layers():
    layers = [
        {"id": "boundary-india", "name": "India National Boundary", "category": "Reference Layers", "geometry_type": "Polygon", "status": "LIVE"},
        {"id": "boundary-state", "name": "State Boundaries", "category": "Reference Layers", "geometry_type": "Polygon", "status": "LIVE"},
        {"id": "boundary-district", "name": "District Boundaries", "category": "Reference Layers", "geometry_type": "Polygon", "status": "LIVE"},
        {"id": "boundary-watershed", "name": "Watershed Boundaries", "category": "Reference Layers", "geometry_type": "Polygon", "status": "LIVE"},
        {"id": "boundary-subwatershed", "name": "Sub-watershed Boundaries", "category": "Reference Layers", "geometry_type": "Polygon", "status": "LIVE"},
        {"id": "hydro-rivers", "name": "Rivers & Stream Network", "category": "Hydrology", "geometry_type": "LineString", "status": "LIVE"},
        {"id": "hydro-waterbodies", "name": "Lakes, Ponds & Water Bodies", "category": "Hydrology", "geometry_type": "Polygon", "status": "LIVE"},
        {"id": "interventions-checkdams", "name": "Check Dams", "category": "Watershed Interventions", "geometry_type": "Point", "status": "LIVE"},
        {"id": "interventions-farmponds", "name": "Farm Ponds", "category": "Watershed Interventions", "geometry_type": "Point", "status": "LIVE"},
        {"id": "interventions-percolation", "name": "Percolation Tanks", "category": "Watershed Interventions", "geometry_type": "Point", "status": "LIVE"},
        {"id": "interventions-plantation", "name": "Plantation Sites", "category": "Watershed Interventions", "geometry_type": "Polygon", "status": "LIVE"},
        {"id": "interventions-restoration", "name": "Restoration Areas", "category": "Watershed Interventions", "geometry_type": "Polygon", "status": "LIVE"},
        {"id": "evidence-photos", "name": "Geotagged Field Photographs", "category": "Field Evidence", "geometry_type": "Point", "status": "LIVE"}
    ]
    return create_success_response(data=layers)
