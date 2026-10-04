from typing import List, Dict, Any

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

def get_demo_satellite_observations(watershed_id: str) -> List[Dict[str, Any]]:
    return [
        {"month": "Feb", "ndvi": 0.39, "ndwi": 0.20},
        {"month": "Mar", "ndvi": 0.43, "ndwi": 0.23},
        {"month": "Apr", "ndvi": 0.48, "ndwi": 0.25},
        {"month": "May", "ndvi": 0.51, "ndwi": 0.30},
        {"month": "Jun", "ndvi": 0.57, "ndwi": 0.34},
        {"month": "Jul", "ndvi": 0.63, "ndwi": 0.40}
    ]
