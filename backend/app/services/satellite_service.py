import httpx
from typing import List, Dict, Any, Optional
from app.core.config import settings

def calculate_ndvi(nir_val: float, red_val: float) -> float:
    denom = nir_val + red_val
    if denom == 0:
        return 0.0
    return round((nir_val - red_val) / denom, 3)

def calculate_ndwi(green_val: float, nir_val: float) -> float:
    denom = green_val + nir_val
    if denom == 0:
        return 0.0
    return round((green_val - nir_val) / denom, 3)

def get_sentinel_hub_wms_layer_url(
    layer_type: str = "TRUE_COLOR",
    bbox: str = "71.0,25.0,72.0,26.0",
    width: int = 512,
    height: int = 512
) -> Dict[str, Any]:
    """Generate dynamic Sentinel-2 WMS OGC Tile URL for Sentinel Hub or fallback layer."""
    instance_id = settings.SENTINEL_HUB_INSTANCE_ID or settings.SATELLITE_API_TOKEN or "demo-instance-id"
    base_url = settings.SATELLITE_API_URL or "https://services.sentinel-hub.com/ogc/wms"

    # Sentinel Hub OGC Layer definitions
    layer_map = {
        "TRUE_COLOR": "TRUE-COLOR",
        "FALSE_COLOR": "FALSE-COLOR",
        "NDVI": "NDVI",
        "NDWI": "NDWI",
        "MOISTURE": "MOISTURE-INDEX"
    }
    sentinel_layer = layer_map.get(layer_type.upper(), "TRUE-COLOR")

    wms_url = (
        f"{base_url}/{instance_id}?"
        f"SERVICE=WMS&REQUEST=GetMap&LAYERS={sentinel_layer}&"
        f"STYLES=&FORMAT=image/png&TRANSPARENT=true&VERSION=1.3.0&"
        f"WIDTH={width}&HEIGHT={height}&CRS=EPSG:4326&BBOX={bbox}"
    )

    is_live = bool(settings.SENTINEL_HUB_INSTANCE_ID or settings.SATELLITE_API_TOKEN)
    provider_status = "live_sentinel_hub" if is_live else "demo_mock_fallback"

    return {
        "provider": settings.SATELLITE_PROVIDER,
        "status": provider_status,
        "is_configured": is_live,
        "layer_type": layer_type,
        "tile_url": wms_url,
        "attribution": "Contains modified Copernicus Sentinel data (2026) processed by Sentinel Hub / JalRakshak AI",
        "bbox": bbox,
    }

async def fetch_sentinel_hub_oauth_token() -> Optional[str]:
    """Fetch OAuth2 Bearer token from Sentinel Hub Auth Service if Client ID & Secret are set."""
    if not (settings.SENTINEL_HUB_CLIENT_ID and settings.SENTINEL_HUB_CLIENT_SECRET):
        return None

    auth_url = "https://services.sentinel-hub.com/oauth/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": settings.SENTINEL_HUB_CLIENT_ID,
        "client_secret": settings.SENTINEL_HUB_CLIENT_SECRET,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(auth_url, data=data)
            if resp.status_code == 200:
                payload = resp.json()
                return payload.get("access_token")
    except Exception:
        pass
    return None

def get_demo_satellite_observations(watershed_id: str) -> List[Dict[str, Any]]:
    return [
        {"month": "Feb", "ndvi": 0.39, "ndwi": 0.20},
        {"month": "Mar", "ndvi": 0.43, "ndwi": 0.23},
        {"month": "Apr", "ndvi": 0.48, "ndwi": 0.25},
        {"month": "May", "ndvi": 0.51, "ndwi": 0.30},
        {"month": "Jun", "ndvi": 0.57, "ndwi": 0.34},
        {"month": "Jul", "ndvi": 0.63, "ndwi": 0.40}
    ]

