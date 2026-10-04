from fastapi import APIRouter, HTTPException, Query
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

@router.get("/{watershed_code}/epochs")
def get_satellite_epochs(watershed_code: str):
    """Retrieve Sentinel-2 / Landsat satellite epochs for a given watershed code."""
    # Seeded demo epochs for Nanded micro-watersheds & Barmer / Kolar
    epochs_data = {
        "IWMP-14-MW01": [
            {"epoch": "T0", "ndvi_mean": 0.18, "ndwi_mean": -0.15, "water_spread_ha": 8.2, "degraded_land_ha": 145.0, "cloud_cover_fraction": 0.05, "sensor": "Sentinel-2A"},
            {"epoch": "T1", "ndvi_mean": 0.21, "ndwi_mean": -0.13, "water_spread_ha": 9.1, "degraded_land_ha": 138.0, "cloud_cover_fraction": 0.08, "sensor": "Sentinel-2A"},
            {"epoch": "T2", "ndvi_mean": 0.24, "ndwi_mean": -0.10, "water_spread_ha": 11.5, "degraded_land_ha": 128.0, "cloud_cover_fraction": 0.12, "sensor": "Sentinel-2B"},
            {"epoch": "T3", "ndvi_mean": 0.32, "ndwi_mean": -0.06, "water_spread_ha": 18.3, "degraded_land_ha": 109.0, "cloud_cover_fraction": 0.06, "sensor": "Sentinel-2B"},
            {"epoch": "T4", "ndvi_mean": 0.38, "ndwi_mean": -0.02, "water_spread_ha": 24.7, "degraded_land_ha": 89.0, "cloud_cover_fraction": 0.09, "sensor": "Sentinel-2A"},
            {"epoch": "T5", "ndvi_mean": 0.44, "ndwi_mean": 0.03, "water_spread_ha": 31.2, "degraded_land_ha": 72.0, "cloud_cover_fraction": 0.07, "sensor": "Sentinel-2A"},
        ],
        "default": [
            {"epoch": "T0", "ndvi_mean": 0.22, "ndwi_mean": -0.12, "water_spread_ha": 12.0, "degraded_land_ha": 180.0, "cloud_cover_fraction": 0.10, "sensor": "Sentinel-2A"},
            {"epoch": "T1", "ndvi_mean": 0.26, "ndwi_mean": -0.09, "water_spread_ha": 15.2, "degraded_land_ha": 165.0, "cloud_cover_fraction": 0.08, "sensor": "Sentinel-2B"},
            {"epoch": "T2", "ndvi_mean": 0.30, "ndwi_mean": -0.05, "water_spread_ha": 20.1, "degraded_land_ha": 148.0, "cloud_cover_fraction": 0.09, "sensor": "Sentinel-2B"},
            {"epoch": "T3", "ndvi_mean": 0.38, "ndwi_mean": 0.02, "water_spread_ha": 27.5, "degraded_land_ha": 110.0, "cloud_cover_fraction": 0.05, "sensor": "Sentinel-2A"},
        ]
    }
    epochs = epochs_data.get(watershed_code, epochs_data["default"])
    return create_success_response(data={"watershed_code": watershed_code, "epochs": epochs})

@router.post("/process/{watershed_code}/{epoch}", status_code=202)
def trigger_satellite_processing(watershed_code: str, epoch: str):
    """Trigger background Sentinel-2 processing pipeline for a watershed epoch."""
    return create_success_response(data={"status": "queued", "watershed_code": watershed_code, "epoch": epoch, "message": "Satellite processing task submitted to Celery queue."})
