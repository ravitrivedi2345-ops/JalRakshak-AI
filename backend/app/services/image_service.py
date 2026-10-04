import os
import uuid
from typing import Tuple, Optional
from fastapi import UploadFile
from PIL import Image
from app.core.config import settings
from app.core.exceptions import APIException
from app.services.exif_service import extract_exif_gps

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

def validate_image_file(file: UploadFile):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise APIException(status_code=400, code="INVALID_FILE_TYPE", message=f"Unsupported file extension {ext}. Allowed: {ALLOWED_EXTENSIONS}")

async def save_uploaded_image(file: UploadFile) -> Tuple[str, str, str, Optional[Tuple[float, float]]]:
    validate_image_file(file)
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise APIException(status_code=413, code="FILE_TOO_LARGE", message=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB}MB")

    ext = os.path.splitext(file.filename)[1].lower()
    unique_name = f"{uuid.uuid4()}{ext}"
    dest_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    with open(dest_path, "wb") as f:
        f.write(content)

    try:
        with Image.open(dest_path) as img:
            img.verify()
    except Exception:
        os.remove(dest_path)
        raise APIException(status_code=400, code="INVALID_IMAGE", message="Uploaded file is not a valid image file.")

    gps = extract_exif_gps(dest_path)
    return unique_name, file.filename, dest_path, gps
