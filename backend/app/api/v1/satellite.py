from fastapi import APIRouter
from app.core.exceptions import create_success_response
from app.services.satellite_service import get_demo_satellite_observations

router = APIRouter(prefix="/satellite", tags=["Satellite Analysis"])

@router.get("/observations")
def get_observations(watershed_id: str = "ws-1"):
    obs = get_demo_satellite_observations(watershed_id)
    return create_success_response(data=obs)

@router.post("/search")
def search_satellite_scenes(watershed_id: str = "ws-1"):
    scenes = [
        {"id": "scene-2026-03", "provider": "Sentinel-2", "acquisition_date": "2026-03-15", "resolution_m": 10.0, "cloud_cover_percent": 2.4},
        {"id": "scene-2026-01", "provider": "Sentinel-2", "acquisition_date": "2026-01-10", "resolution_m": 10.0, "cloud_cover_percent": 0.8}
    ]
    return create_success_response(data=scenes)
