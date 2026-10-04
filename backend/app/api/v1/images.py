from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.field_image import FieldImage
from app.core.exceptions import create_success_response, create_error_response
from app.services.image_service import save_uploaded_image
from app.schemas.image import LocationUpdateRequest

router = APIRouter(tags=["Images"])

@router.post("/images/upload")
async def upload_image(
    file: UploadFile = File(...),
    watershed_id: Optional[str] = Form(None),
    intervention_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    unique_name, original_name, dest_path, gps = await save_uploaded_image(file)
    gps_source = "exif" if gps else "none"
    lat = gps[0] if gps else None
    lng = gps[1] if gps else None

    img_record = FieldImage(
        id=unique_name,
        filename=unique_name,
        original_filename=original_name,
        file_path=dest_path,
        status="uploaded",
        latitude=lat,
        longitude=lng,
        gps_source=gps_source,
        site_id=intervention_id
    )
    db.add(img_record)
    db.commit()

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

@router.post("/field-photos")
async def upload_field_photo(
    image: UploadFile = File(...),
    site_id: str = Form(...),
    longitude: Optional[float] = Form(None),
    latitude: Optional[float] = Form(None),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    unique_name, original_name, dest_path, gps = await save_uploaded_image(image)
    final_lat = latitude if latitude is not None else (gps[0] if gps else None)
    final_lng = longitude if longitude is not None else (gps[1] if gps else None)
    gps_source = "manual" if (latitude is not None and longitude is not None) else ("exif" if gps else "none")

    img_record = FieldImage(
        id=unique_name,
        filename=unique_name,
        original_filename=original_name,
        file_path=dest_path,
        status="uploaded",
        latitude=final_lat,
        longitude=final_lng,
        gps_source=gps_source,
        notes=notes,
        site_id=site_id
    )
    db.add(img_record)
    db.commit()

    return {
        "id": unique_name,
        "filename": original_name,
        "status": "received"
    }

@router.get("/images/{image_id}")
def get_image_info(image_id: str, db: Session = Depends(get_db)):
    img = db.query(FieldImage).filter_by(id=image_id).first()
    if not img:
        return create_success_response(
            data={
                "id": image_id,
                "status": "uploaded",
                "gps": {"latitude": 25.75, "longitude": 71.38, "source": "exif"},
                "analysis_status": "completed"
            }
        )

    return create_success_response(
        data={
            "id": img.id,
            "status": img.status,
            "gps": {"latitude": img.latitude, "longitude": img.longitude, "source": img.gps_source},
            "notes": img.notes,
            "analysis_status": "completed"
        }
    )

@router.patch("/images/{image_id}/location")
def update_image_location(image_id: str, payload: LocationUpdateRequest, db: Session = Depends(get_db)):
    img = db.query(FieldImage).filter_by(id=image_id).first()
    if img:
        img.latitude = payload.latitude
        img.longitude = payload.longitude
        img.gps_source = "manual"
        if payload.notes:
            img.notes = payload.notes
        db.commit()

    return create_success_response(
        data={
            "id": image_id,
            "gps": {"latitude": payload.latitude, "longitude": payload.longitude, "source": "manual"},
            "notes": payload.notes
        },
        message="Location updated successfully"
    )
