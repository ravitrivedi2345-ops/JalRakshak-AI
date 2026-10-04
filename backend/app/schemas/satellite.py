from typing import List, Optional
from pydantic import BaseModel

class SatelliteObservation(BaseModel):
    id: str
    provider: str
    acquisition_date: str
    resolution_meters: float
    cloud_cover_percent: float
    bands: List[str]

class IndexCalculationRequest(BaseModel):
    watershed_id: str
    date_range: Optional[List[str]] = None

class IndexCalculationResult(BaseModel):
    index_name: str
    formula_used: str
    mean_value: float
    acquisition_date: str
    cloud_cover_percent: float
    valid_pixel_ratio: float
