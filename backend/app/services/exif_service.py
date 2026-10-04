from typing import Optional, Tuple
from PIL import Image, ImageOps
import exifread

def parse_dms(dms, ref) -> float:
    degrees = float(dms[0].num) / float(dms[0].den)
    minutes = float(dms[1].num) / float(dms[1].den)
    seconds = float(dms[2].num) / float(dms[2].den)
    sub = degrees + (minutes / 60.0) + (seconds / 3600.0)
    if ref in ['S', 'W']:
        sub = -sub
    return sub

def extract_exif_gps(file_path: str) -> Optional[Tuple[float, float]]:
    try:
        with open(file_path, 'rb') as f:
            tags = exifread.process_file(f, details=False)
            latitude_tag = tags.get('GPS GPSLatitude')
            latitude_ref = tags.get('GPS GPSLatitudeRef')
            longitude_tag = tags.get('GPS GPSLongitude')
            longitude_ref = tags.get('GPS GPSLongitudeRef')

            if latitude_tag and latitude_ref and longitude_tag and longitude_ref:
                lat = parse_dms(latitude_tag.values, latitude_ref.values)
                lon = parse_dms(longitude_tag.values, longitude_ref.values)
                if -90 <= lat <= 90 and -180 <= lon <= 180:
                    return (lat, lon)
    except Exception as e:
        pass
    return None
