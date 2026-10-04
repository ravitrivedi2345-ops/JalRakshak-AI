from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends
from app.core.exceptions import create_success_response, create_error_response
from app.services.image_service import save_uploaded_image
from app.schemas.image import LocationUpdateRequest

router = APIRouter(tags=["Images"])

@router.post("/images/upload")
async def upload_image(
    file: UploadFile = File(...),
    watershed_id: Optional[str] = Form(None),
    intervention_id: Optional[str] = Form(None)
):
    unique_name, original_name, dest_path, gps = await save_uploaded_image(file)
    gps_data = None
    if gps:
        gps_data = {"latitude": gps[0], "longitude": gps[1], "source": "exif"}

    return create_success_response(
        data={
            "id": unique_name,
            "status": "uploaded",
            "gps": gps_data,
            "captured_at": None,
            "analysis_status": "pending",
            "filename": original_name
        },
        message="Image uploaded successfully"
    )

# Frontend Integration API Contract Compatibility Endpoint
@router.post("/field-photos")
async def upload_field_photo(
    image: UploadFile = File(...),
    site_id: str = Form(...),
    longitude: Optional[float] = Form(None),
    latitude: Optional[float] = Form(None),
    notes: Optional[str] = Form(None)
):
    unique_name, original_name, dest_path, gps = await save_uploaded_image(image)
    return {
        "id": unique_name,
        "filename": original_name,
        "status": "received"
    }

@router.get("/images/{image_id}")
def get_image_info(image_id: str):
    return create_success_response(
        data={
            "id": image_id,
            "status": "uploaded",
            "gps": {"latitude": 25.75, "longitude": 71.38, "source": "exif"},
            "analysis_status": "completed"
        }
    )

@router.patch("/images/{image_id}/location")
def update_image_location(image_id: str, payload: LocationUpdateRequest):
    return create_success_response(
        data={
            "id": image_id,
            "gps": {"latitude": payload.latitude, "longitude": payload.longitude, "source": "manual"},
            "notes": payload.notes
        },
        message="Location updated successfully"
    )
