import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Path, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.db.session import get_db
from app.models.waterbody import (
    Waterbody,
    WaterbodyInspection,
    WaterbodyMeasurement,
    WaterbodyRestoration,
    WaterbodyFieldPhoto,
)
from app.core.exceptions import create_success_response, create_error_response
from app.core.security import decode_access_token

router = APIRouter(prefix="/waterbodies", tags=["Waterbody Explorer (Patna)"])

def get_current_user_role(request: Request) -> str:
    """Helper to detect user role from Bearer token if provided."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        payload = decode_access_token(token)
        if payload and "role" in payload:
            return payload.get("role", "citizen")
    return "citizen"


@router.get("/summary")
def get_waterbodies_summary(
    district: Optional[str] = "Patna",
    db: Session = Depends(get_db)
):
    """
    Return aggregate totals and counts by inspection status, priority, and waterbody type.
    """
    query = db.query(Waterbody)
    if district and district.lower() != "all":
        query = query.filter(Waterbody.district.ilike(f"%{district}%"))

    waterbodies = query.all()

    by_status = {
        "not_inspected": 0,
        "pending": 0,
        "verified": 0,
        "action_required": 0,
        "restoration_in_progress": 0,
    }
    by_priority = {
        "high": 0,
        "medium": 0,
        "low": 0,
    }
    by_type: Dict[str, int] = {}
    total_area = 0.0
    verified_boundaries_count = 0

    for wb in waterbodies:
        # Status count
        status_key = wb.inspection_status or "not_inspected"
        if status_key in by_status:
            by_status[status_key] += 1
        else:
            by_status[status_key] = 1

        # Priority count
        priority_key = (wb.priority or "medium").lower()
        if priority_key in by_priority:
            by_priority[priority_key] += 1

        # Type count
        type_key = wb.waterbody_type or "pond"
        by_type[type_key] = by_type.get(type_key, 0) + 1

        # Area & boundary
        if wb.area_hectares:
            total_area += wb.area_hectares
        if wb.is_verified_boundary:
            verified_boundaries_count += 1

    summary_data = {
        "district": district or "Patna",
        "state": "Bihar",
        "total_waterbodies": len(waterbodies),
        "by_status": by_status,
        "by_priority": by_priority,
        "by_type": by_type,
        "total_area_hectares": round(total_area, 2),
        "verified_boundaries_count": verified_boundaries_count,
    }
    return create_success_response(data=summary_data, message="Waterbody summary fetched successfully")


@router.get("")
def list_waterbodies(
    q: Optional[str] = Query(None, description="Search by name or unique ID"),
    status: Optional[str] = Query(None, description="Filter by inspection status"),
    priority: Optional[str] = Query(None, description="Filter by priority: low, medium, high"),
    waterbody_type: Optional[str] = Query(None, description="Filter by type: pond, lake, reservoir, wetland, tank"),
    district: Optional[str] = Query(None, description="Filter by district: e.g. Patna"),
    bbox: Optional[str] = Query(None, description="min_lon,min_lat,max_lon,max_lat bounding box"),
    sort_by: Optional[str] = Query("priority", description="Sort by name, last_inspected_at, priority, area_hectares"),
    sort_order: Optional[str] = Query("desc", description="Sort direction: asc or desc"),
    format: Optional[str] = Query("json", description="json or geojson"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=200, description="Items per page"),
    db: Session = Depends(get_db)
):
    """
    Search and filter waterbodies in Patna, Bihar with pagination and optional GeoJSON export.
    """
    query = db.query(Waterbody)

    # Search filter
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(or_(Waterbody.name.ilike(term), Waterbody.id.ilike(term)))

    # Status filter
    if status and status.lower() != "all":
        query = query.filter(Waterbody.inspection_status == status.lower())

    # Priority filter
    if priority and priority.lower() != "all":
        query = query.filter(Waterbody.priority == priority.lower())

    # Waterbody type filter
    if waterbody_type and waterbody_type.lower() != "all":
        query = query.filter(Waterbody.waterbody_type == waterbody_type.lower())

    # District filter
    if district and district.lower() != "all":
        query = query.filter(Waterbody.district.ilike(f"%{district}%"))

    # Bounding box filter (min_lon, min_lat, max_lon, max_lat)
    if bbox:
        try:
            parts = [float(x.strip()) for x in bbox.split(",")]
            if len(parts) == 4:
                min_lon, min_lat, max_lon, max_lat = parts
                query = query.filter(
                    Waterbody.longitude >= min_lon,
                    Waterbody.longitude <= max_lon,
                    Waterbody.latitude >= min_lat,
                    Waterbody.latitude <= max_lat
                )
        except Exception:
            pass

    # Total matching records before pagination
    total_count = query.count()

    # Sorting
    sort_column = Waterbody.created_at
    if sort_by == "name":
        sort_column = Waterbody.name
    elif sort_by == "last_inspected_at":
        sort_column = Waterbody.last_inspected_at
    elif sort_by == "area_hectares":
        sort_column = Waterbody.area_hectares
    elif sort_by == "priority":
        # Custom priority order (high -> medium -> low)
        sort_column = Waterbody.priority

    if sort_order.lower() == "desc":
        query = query.order_by(desc(sort_column).nulls_last())
    else:
        query = query.order_by(asc(sort_column).nulls_first())

    items = query.offset((page - 1) * limit).limit(limit).all()

    # Format as GeoJSON FeatureCollection if requested
    if format.lower() == "geojson":
        features = []
        for wb in items:
            geom = None
            if wb.boundary_geojson:
                try:
                    geom = json.loads(wb.boundary_geojson)
                except Exception:
                    geom = None
            if not geom:
                geom = {"type": "Point", "coordinates": [wb.longitude, wb.latitude]}

            features.append({
                "type": "Feature",
                "id": wb.id,
                "properties": {
                    "id": wb.id,
                    "name": wb.name,
                    "district": wb.district,
                    "state": wb.state,
                    "waterbody_type": wb.waterbody_type,
                    "area_hectares": wb.area_hectares,
                    "inspection_status": wb.inspection_status,
                    "priority": wb.priority,
                    "priority_reason": wb.priority_reason,
                    "last_inspected_at": wb.last_inspected_at.isoformat() if wb.last_inspected_at else None,
                    "data_source": wb.data_source,
                    "is_verified_boundary": wb.is_verified_boundary,
                    "has_polygon": bool(wb.boundary_geojson)
                },
                "geometry": geom
            })
        return create_success_response(
            data={"type": "FeatureCollection", "features": features, "total": total_count},
            message="Waterbodies GeoJSON collection retrieved"
        )

    # Standard JSON items response
    results = []
    for wb in items:
        boundary_obj = None
        if wb.boundary_geojson:
            try:
                boundary_obj = json.loads(wb.boundary_geojson)
            except Exception:
                boundary_obj = None

        results.append({
            "id": wb.id,
            "name": wb.name,
            "district": wb.district,
            "state": wb.state,
            "latitude": wb.latitude,
            "longitude": wb.longitude,
            "waterbody_type": wb.waterbody_type,
            "area_hectares": wb.area_hectares,
            "inspection_status": wb.inspection_status,
            "priority": wb.priority,
            "priority_reason": wb.priority_reason,
            "last_inspected_at": wb.last_inspected_at.isoformat() if wb.last_inspected_at else None,
            "data_source": wb.data_source,
            "is_verified_boundary": wb.is_verified_boundary,
            "has_polygon": bool(wb.boundary_geojson),
            "boundary": boundary_obj,
            "created_at": wb.created_at.isoformat() if wb.created_at else None,
            "updated_at": wb.updated_at.isoformat() if wb.updated_at else None
        })

    return create_success_response(
        data={
            "items": results,
            "total": total_count,
            "page": page,
            "limit": limit,
            "pages": (total_count + limit - 1) // limit if limit > 0 else 1
        },
        message="Waterbodies retrieved successfully"
    )


@router.get("/{waterbody_id}")
def get_waterbody_detail(
    waterbody_id: str = Path(..., description="Unique waterbody identifier"),
    db: Session = Depends(get_db)
):
    """
    Fetch comprehensive details for a specific waterbody in Patna.
    """
    wb = db.query(Waterbody).filter(Waterbody.id == waterbody_id).first()
    if not wb:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"Waterbody with ID '{waterbody_id}' not found"
        )

    boundary_obj = None
    if wb.boundary_geojson:
        try:
            boundary_obj = json.loads(wb.boundary_geojson)
        except Exception:
            boundary_obj = None

    detail = {
        "id": wb.id,
        "name": wb.name,
        "district": wb.district,
        "state": wb.state,
        "latitude": wb.latitude,
        "longitude": wb.longitude,
        "waterbody_type": wb.waterbody_type,
        "area_hectares": wb.area_hectares,
        "inspection_status": wb.inspection_status,
        "priority": wb.priority,
        "priority_reason": wb.priority_reason,
        "last_inspected_at": wb.last_inspected_at.isoformat() if wb.last_inspected_at else None,
        "data_source": wb.data_source,
        "is_verified_boundary": wb.is_verified_boundary,
        "has_polygon": bool(wb.boundary_geojson),
        "boundary": boundary_obj,
        "created_at": wb.created_at.isoformat() if wb.created_at else None,
        "updated_at": wb.updated_at.isoformat() if wb.updated_at else None,
        "inspections_count": len(wb.inspections),
        "measurements_count": len(wb.measurements),
        "restorations_count": len(wb.restorations),
        "photos_count": len(wb.photos)
    }

    return create_success_response(data=detail, message="Waterbody details retrieved")


@router.get("/{waterbody_id}/history")
def get_waterbody_history(
    waterbody_id: str = Path(..., description="Unique waterbody identifier"),
    db: Session = Depends(get_db)
):
    """
    Return chronological inspections, water-spread measurements, satellite series,
    field photos, and restoration records for a waterbody.
    """
    wb = db.query(Waterbody).filter(Waterbody.id == waterbody_id).first()
    if not wb:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"Waterbody with ID '{waterbody_id}' not found"
        )

    # 1. Inspections
    inspections = [
        {
            "id": insp.id,
            "inspection_date": insp.inspection_date.isoformat(),
            "status": insp.status,
            "observations": insp.observations,
            "inspector_name": insp.inspector_name,
            "inspector_role": insp.inspector_role,
            "confidence_score": insp.confidence_score,
            "recommended_action": insp.recommended_action,
            "is_demo_data": insp.is_demo_data
        }
        for insp in wb.inspections
    ]

    # 2. Measurements
    measurements = [
        {
            "id": m.id,
            "measurement_date": m.measurement_date.isoformat(),
            "water_spread_area_ha": m.water_spread_area_ha,
            "water_spread_percentage": m.water_spread_percentage,
            "source": m.source,
            "source_type": m.source_type,
            "notes": m.notes,
            "is_demo_data": m.is_demo_data
        }
        for m in sorted(wb.measurements, key=lambda x: x.measurement_date)
    ]

    # 3. Restoration records
    restorations = [
        {
            "id": r.id,
            "activity_type": r.activity_type,
            "description": r.description,
            "start_date": r.start_date.isoformat(),
            "completion_date": r.completion_date.isoformat() if r.completion_date else None,
            "status": r.status,
            "outcome": r.outcome,
            "budget_inr": r.budget_inr,
            "is_demo_data": r.is_demo_data
        }
        for r in wb.restorations
    ]

    # 4. Field photos
    photos = [
        {
            "id": p.id,
            "photo_url": p.photo_url,
            "caption": p.caption,
            "taken_at": p.taken_at.isoformat(),
            "photographer": p.photographer,
            "is_verified_exif": p.is_verified_exif,
            "is_demo_data": p.is_demo_data
        }
        for p in wb.photos
    ]

    has_history = bool(inspections or measurements or restorations or photos)

    history_data = {
        "waterbody_id": wb.id,
        "waterbody_name": wb.name,
        "has_history": has_history,
        "inspections": inspections,
        "measurements": measurements,
        "restorations": restorations,
        "photos": photos,
        "measurement_trend_available": len(measurements) >= 2
    }
    return create_success_response(data=history_data, message="Waterbody history retrieved")


@router.get("/{waterbody_id}/inspections")
def get_waterbody_inspections(
    waterbody_id: str = Path(..., description="Unique waterbody identifier"),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    Return authorized inspection records with role-based security sanitisation.
    """
    wb = db.query(Waterbody).filter(Waterbody.id == waterbody_id).first()
    if not wb:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"Waterbody with ID '{waterbody_id}' not found"
        )

    user_role = get_current_user_role(request) if request else "citizen"
    is_authorized_staff = user_role in ("admin", "officer", "verifier", "field_officer")

    inspections_list = []
    for insp in wb.inspections:
        inspector_display = insp.inspector_name if is_authorized_staff else f"Verified {insp.inspector_role}"
        inspections_list.append({
            "id": insp.id,
            "waterbody_id": insp.waterbody_id,
            "inspection_date": insp.inspection_date.isoformat(),
            "status": insp.status,
            "observations": insp.observations,
            "inspector_name": inspector_display,
            "inspector_role": insp.inspector_role,
            "confidence_score": insp.confidence_score,
            "recommended_action": insp.recommended_action,
            "is_demo_data": insp.is_demo_data
        })

    return create_success_response(
        data={
            "waterbody_id": wb.id,
            "waterbody_name": wb.name,
            "inspections": inspections_list,
            "is_authorized_view": is_authorized_staff
        },
        message="Inspections retrieved"
    )
