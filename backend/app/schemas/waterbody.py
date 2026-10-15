from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

class WaterbodyBase(BaseModel):
    name: str
    district: str = "Patna"
    state: str = "Bihar"
    latitude: float
    longitude: float
    waterbody_type: str = "pond"
    area_hectares: Optional[float] = None
    inspection_status: str = "not_inspected"
    priority: str = "medium"
    priority_reason: Optional[str] = None
    data_source: str = "OpenStreetMap / Bihar State Wetland Authority"
    is_verified_boundary: bool = False

class WaterbodyResponse(WaterbodyBase):
    id: str
    boundary_geojson: Optional[str] = None
    last_inspected_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class WaterbodyFeature(BaseModel):
    type: str = "Feature"
    properties: Dict[str, Any]
    geometry: Dict[str, Any]

class WaterbodyFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[WaterbodyFeature]

class InspectionResponse(BaseModel):
    id: str
    waterbody_id: str
    inspection_date: datetime
    status: str
    observations: str
    inspector_name: str
    inspector_role: str
    confidence_score: float
    recommended_action: Optional[str] = None
    is_demo_data: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class MeasurementResponse(BaseModel):
    id: str
    waterbody_id: str
    measurement_date: datetime
    water_spread_area_ha: float
    water_spread_percentage: Optional[float] = None
    source: str
    source_type: str
    notes: Optional[str] = None
    is_demo_data: bool = True

    class Config:
        from_attributes = True

class RestorationResponse(BaseModel):
    id: str
    waterbody_id: str
    activity_type: str
    description: str
    start_date: datetime
    completion_date: Optional[datetime] = None
    status: str
    outcome: Optional[str] = None
    budget_inr: Optional[float] = None
    is_demo_data: bool = True

    class Config:
        from_attributes = True

class FieldPhotoResponse(BaseModel):
    id: str
    waterbody_id: str
    photo_url: str
    caption: str
    taken_at: datetime
    photographer: str
    is_verified_exif: bool
    is_demo_data: bool = True

    class Config:
        from_attributes = True

class WaterbodyHistoryResponse(BaseModel):
    waterbody_id: str
    waterbody_name: str
    inspections: List[InspectionResponse]
    measurements: List[MeasurementResponse]
    restorations: List[RestorationResponse]
    photos: List[FieldPhotoResponse]
    has_history: bool

class WaterbodySummaryResponse(BaseModel):
    total_waterbodies: int
    by_status: Dict[str, int]
    by_priority: Dict[str, int]
    by_type: Dict[str, int]
    total_area_hectares: float
    verified_boundaries_count: int
    district: str
    state: str
