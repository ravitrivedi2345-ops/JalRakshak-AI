from typing import Optional
from pydantic import BaseModel

class GPSCoordinates(BaseModel):
    latitude: float
    longitude: float
    source: str = "exif"  # "exif", "manual", "device"

class ImageUploadData(BaseModel):
    id: str
    status: str = "uploaded"
    gps: Optional[GPSCoordinates] = None
    captured_at: Optional[str] = None
    analysis_status: str = "pending"
    file_path: Optional[str] = None

class LocationUpdateRequest(BaseModel):
    latitude: float
    longitude: float
    notes: Optional[str] = None
