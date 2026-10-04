from fastapi import APIRouter
from app.core.exceptions import create_success_response

router = APIRouter(tags=["Watersheds & GIS"])

SAMPLE_SITES = [
    {"id": "barmer", "name": "Barmer Farm Pond", "district": "Barmer · Rajasthan", "kind": "Farm pond", "status": "Needs verification", "score": 82, "reason": "Seasonal water spread needs a local field check", "coordinates": [71.38, 25.75], "photo": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=560&q=82"},
    {"id": "darrang", "name": "Darrang Check Dam", "district": "Darrang · Assam", "kind": "Check dam", "status": "Needs verification", "score": 76, "reason": "Recent field photo needs a site-location cross-check", "coordinates": [92.02, 26.45], "photo": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=560&q=82"},
    {"id": "kolar", "name": "Kolar Plantation Watch", "district": "Kolar · Karnataka", "kind": "Plantation", "status": "Monitoring", "score": 91, "reason": "Vegetation trend is above its illustrative seasonal baseline", "coordinates": [78.13, 13.14], "photo": "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=560&q=82"},
    {"id": "koraput", "name": "Koraput Erosion Watch", "district": "Koraput · Odisha", "kind": "Erosion risk", "status": "Needs verification", "score": 71, "reason": "Exposed soil signal needs confirmation by a field team", "coordinates": [82.72, 18.81], "photo": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=560&q=82"}
]

@router.get("/watersheds")
def list_watersheds():
    return create_success_response(data=[
        {"id": "ws-1", "name": "Luni River Sub-basin", "district": "Barmer", "state": "Rajasthan", "area_sq_km": 1420.5}
    ])

@router.get("/watersheds/{watershed_id}")
def get_watershed_details(watershed_id: str):
    return create_success_response(data={
        "id": watershed_id,
        "name": "Luni River Sub-basin",
        "district": "Barmer",
        "state": "Rajasthan",
        "area_sq_km": 1420.5,
        "sites_count": 12480
    })

@router.get("/watersheds/{watershed_id}/boundary")
def get_watershed_boundary(watershed_id: str):
    geojson = {
        "type": "Feature",
        "properties": {"id": watershed_id, "name": "Luni River Sub-basin"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[68.1, 23.2], [72.4, 19.1], [77.1, 8.1], [88.2, 22.1], [68.1, 23.2]]]
        }
    }
    return create_success_response(data=geojson)

@router.get("/map/features")
def get_map_features():
    features = []
    for s in SAMPLE_SITES:
        features.append({
            "type": "Feature",
            "properties": {"id": s["id"], "name": s["name"], "status": s["status"], "kind": s["kind"]},
            "geometry": {"type": "Point", "coordinates": s["coordinates"]}
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
