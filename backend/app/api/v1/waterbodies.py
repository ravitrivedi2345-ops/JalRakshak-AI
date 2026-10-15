import json
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, Path, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.db.session import get_db
from app.models.waterbody import (
    Waterbody,
    WaterbodyInspection,
    WaterbodyMeasurement,
    WaterbodyRestoration,
    WaterbodyFieldPhoto,
    WaterbodyChangeDetection,
)
from app.core.exceptions import create_success_response, create_error_response
from app.core.security import decode_access_token
from app.services.satellite_change_service import (
    get_patna_sentinel_availability,
    run_satellite_change_detection,
    generate_change_detection_csv,
    generate_change_detection_pdf_bytes,
)

class ChangeDetectionRequest(BaseModel):
    earlier_date: str = Field(..., description="Earlier observation date (YYYY-MM-DD)")
    later_date: str = Field(..., description="Later observation date (YYYY-MM-DD)")
    ndwi_threshold: float = Field(default=0.0, ge=-0.5, le=0.5, description="NDWI threshold for water classification (-0.50 to +0.50)")
    tolerance_pct: float = Field(default=3.0, ge=0.5, le=20.0, description="Tolerance percentage for stable classification")
    min_change_ha: float = Field(default=0.03, ge=0.01, le=1.0, description="Minimum change threshold in hectares")
    save_to_history: bool = Field(default=True, description="Persist analysis to database history")
    record_measurement: bool = Field(default=False, description="Also record later observation in waterbody measurements timeline")

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


@router.get("/{waterbody_id}/satellite-availability")
def get_satellite_availability(
    waterbody_id: str = Path(..., description="Unique waterbody identifier"),
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
    max_cloud_cover: float = Query(35.0, ge=0.0, le=100.0, description="Maximum acceptable cloud cover percentage"),
    db: Session = Depends(get_db)
):
    """
    Retrieve available Sentinel-2 Level-2A surface reflectance overpass scenes
    covering the selected waterbody in Patna, Bihar (Tile 45RTT).
    """
    wb = db.query(Waterbody).filter(Waterbody.id == waterbody_id).first()
    if not wb:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"Waterbody with ID '{waterbody_id}' not found"
        )

    scenes = get_patna_sentinel_availability(
        waterbody_id=wb.id,
        start_date=start_date,
        end_date=end_date,
        max_cloud_cover=max_cloud_cover
    )

    return create_success_response(
        data={
            "waterbody_id": wb.id,
            "waterbody_name": wb.name,
            "district": wb.district,
            "state": wb.state,
            "coordinates": {"latitude": wb.latitude, "longitude": wb.longitude},
            "sensor": "Sentinel-2 MSI Level-2A (Surface Reflectance / BOA)",
            "tile": "T45RTT",
            "revisit_interval_days": 5,
            "total_scenes_available": len(scenes),
            "scenes": scenes,
            "recommended_pair": {
                "earlier_date": "2025-05-21",
                "later_date": "2025-10-23",
                "label": "Pre-Monsoon May 2025 vs Post-Monsoon Oct 2025 (Optimal Quality, Cloud < 5%)"
            }
        },
        message="Satellite scenes availability retrieved"
    )


@router.post("/{waterbody_id}/change-detection")
def compute_satellite_change_detection(
    payload: ChangeDetectionRequest,
    waterbody_id: str = Path(..., description="Unique waterbody identifier"),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    Execute high-resolution Sentinel-2 NDWI change detection between two observation dates.
    Calculates surface water spread, hectare change, percentage change, and classifies
    shrinkage/expansion/stability.
    """
    wb = db.query(Waterbody).filter(Waterbody.id == waterbody_id).first()
    if not wb:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"Waterbody with ID '{waterbody_id}' not found"
        )

    # Validate date ordering
    if payload.earlier_date >= payload.later_date:
        return create_error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_DATES",
            message=f"Earlier date ({payload.earlier_date}) must be chronologically before later date ({payload.later_date})"
        )

    # Perform raster and NDWI calculations
    try:
        analysis_result = run_satellite_change_detection(
            waterbody_id=wb.id,
            waterbody_name=wb.name,
            center_lat=wb.latitude,
            center_lon=wb.longitude,
            boundary_geojson_str=wb.boundary_geojson,
            baseline_area_ha=wb.area_hectares,
            earlier_date=payload.earlier_date,
            later_date=payload.later_date,
            ndwi_threshold=payload.ndwi_threshold,
            tolerance_pct=payload.tolerance_pct,
            min_change_ha=payload.min_change_ha,
        )
    except Exception as e:
        return create_error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="ANALYSIS_FAILED",
            message=f"Satellite change detection computation error: {str(e)}"
        )

    # Persist in DB if requested
    record_id = None
    if payload.save_to_history:
        record = WaterbodyChangeDetection(
            waterbody_id=wb.id,
            earlier_date=payload.earlier_date,
            later_date=payload.later_date,
            ndwi_threshold=payload.ndwi_threshold,
            tolerance_pct=payload.tolerance_pct,
            earlier_area_ha=analysis_result["earlier_area_ha"],
            later_area_ha=analysis_result["later_area_ha"],
            change_ha=analysis_result["change_ha"],
            change_pct=analysis_result["change_pct"],
            classification=analysis_result["classification"],
            classification_reason=analysis_result["classification_reason"],
            confidence_score=analysis_result["confidence_score"],
            earlier_cloud_cover_pct=analysis_result["earlier_cloud_cover_pct"],
            later_cloud_cover_pct=analysis_result["later_cloud_cover_pct"],
            earlier_valid_coverage_pct=analysis_result["earlier_valid_coverage_pct"],
            later_valid_coverage_pct=analysis_result["later_valid_coverage_pct"],
            satellite_sensor=analysis_result["satellite_sensor"],
            data_source=analysis_result["data_source"],
            earlier_true_color_url=analysis_result["earlier_true_color_url"],
            later_true_color_url=analysis_result["later_true_color_url"],
            earlier_ndwi_mask_url=analysis_result["earlier_ndwi_mask_url"],
            later_ndwi_mask_url=analysis_result["later_ndwi_mask_url"],
            diff_map_url=analysis_result["diff_map_url"],
            metadata_json=json.dumps(analysis_result["metadata"])
        )
        db.add(record)

        # Optionally append to measurements timeline
        if payload.record_measurement:
            measurement_date = datetime.strptime(payload.later_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            meas = WaterbodyMeasurement(
                waterbody_id=wb.id,
                measurement_date=measurement_date,
                water_spread_area_ha=analysis_result["later_area_ha"],
                water_spread_percentage=round((analysis_result["later_area_ha"] / (wb.area_hectares or analysis_result["later_area_ha"])) * 100, 1) if wb.area_hectares else 100.0,
                source=f"Sentinel-2 L2A NDWI (Threshold {payload.ndwi_threshold:+.2f})",
                source_type="satellite",
                notes=f"Change detection run: {analysis_result['classification'].capitalize()} ({analysis_result['change_ha']:+.2f} ha / {analysis_result['change_pct']:+.1f}%) compared to {payload.earlier_date}",
                is_demo_data=False
            )
            db.add(meas)

        db.commit()
        db.refresh(record)
        record_id = record.id

    analysis_result["id"] = record_id
    return create_success_response(
        data=analysis_result,
        message="Satellite change detection computed successfully"
    )


@router.get("/{waterbody_id}/change-detection/history")
def get_change_detection_history(
    waterbody_id: str = Path(..., description="Unique waterbody identifier"),
    db: Session = Depends(get_db)
):
    """
    Retrieve chronological history of previous satellite change detection runs for a waterbody.
    """
    wb = db.query(Waterbody).filter(Waterbody.id == waterbody_id).first()
    if not wb:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"Waterbody with ID '{waterbody_id}' not found"
        )

    records = db.query(WaterbodyChangeDetection).filter(
        WaterbodyChangeDetection.waterbody_id == waterbody_id
    ).order_by(desc(WaterbodyChangeDetection.created_at)).all()

    items = []
    for r in records:
        items.append({
            "id": r.id,
            "waterbody_id": r.waterbody_id,
            "earlier_date": r.earlier_date,
            "later_date": r.later_date,
            "ndwi_threshold": r.ndwi_threshold,
            "tolerance_pct": r.tolerance_pct,
            "earlier_area_ha": r.earlier_area_ha,
            "later_area_ha": r.later_area_ha,
            "change_ha": r.change_ha,
            "change_pct": r.change_pct,
            "classification": r.classification,
            "classification_reason": r.classification_reason,
            "confidence_score": r.confidence_score,
            "earlier_cloud_cover_pct": r.earlier_cloud_cover_pct,
            "later_cloud_cover_pct": r.later_cloud_cover_pct,
            "earlier_valid_coverage_pct": r.earlier_valid_coverage_pct,
            "later_valid_coverage_pct": r.later_valid_coverage_pct,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "diff_map_url": r.diff_map_url,
        })

    return create_success_response(
        data={
            "waterbody_id": wb.id,
            "waterbody_name": wb.name,
            "total_runs": len(items),
            "history": items
        },
        message="Change detection history fetched successfully"
    )


@router.get("/{waterbody_id}/change-detection/{run_id}/export-csv")
def export_change_detection_csv(
    waterbody_id: str = Path(..., description="Unique waterbody identifier"),
    run_id: str = Path(..., description="Change detection run ID"),
    db: Session = Depends(get_db)
):
    """
    Download a change detection analysis record as a formatted CSV document.
    """
    wb = db.query(Waterbody).filter(Waterbody.id == waterbody_id).first()
    if not wb:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Waterbody not found")

    record = db.query(WaterbodyChangeDetection).filter(
        WaterbodyChangeDetection.id == run_id,
        WaterbodyChangeDetection.waterbody_id == waterbody_id
    ).first()

    if not record:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Analysis record not found")

    rec_dict = {
        "waterbody_id": wb.id,
        "waterbody_name": wb.name,
        "earlier_date": record.earlier_date,
        "later_date": record.later_date,
        "ndwi_threshold": record.ndwi_threshold,
        "tolerance_pct": record.tolerance_pct,
        "earlier_area_ha": record.earlier_area_ha,
        "later_area_ha": record.later_area_ha,
        "change_ha": record.change_ha,
        "change_pct": record.change_pct,
        "classification": record.classification,
        "classification_reason": record.classification_reason,
        "confidence_score": record.confidence_score,
        "earlier_cloud_cover_pct": record.earlier_cloud_cover_pct,
        "later_cloud_cover_pct": record.later_cloud_cover_pct,
        "earlier_valid_coverage_pct": record.earlier_valid_coverage_pct,
        "later_valid_coverage_pct": record.later_valid_coverage_pct,
        "satellite_sensor": record.satellite_sensor,
        "data_source": record.data_source,
    }

    csv_content = generate_change_detection_csv(rec_dict)
    filename = f"jalrakshak_change_{wb.id}_{record.earlier_date}_{record.later_date}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/{waterbody_id}/change-detection/{run_id}/export-pdf")
def export_change_detection_pdf(
    waterbody_id: str = Path(..., description="Unique waterbody identifier"),
    run_id: str = Path(..., description="Change detection run ID"),
    db: Session = Depends(get_db)
):
    """
    Download a change detection analysis record as a formal PDF report with map visuals.
    """
    wb = db.query(Waterbody).filter(Waterbody.id == waterbody_id).first()
    if not wb:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Waterbody not found")

    record = db.query(WaterbodyChangeDetection).filter(
        WaterbodyChangeDetection.id == run_id,
        WaterbodyChangeDetection.waterbody_id == waterbody_id
    ).first()

    if not record:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Analysis record not found")

    rec_dict = {
        "waterbody_id": wb.id,
        "waterbody_name": wb.name,
        "earlier_date": record.earlier_date,
        "later_date": record.later_date,
        "ndwi_threshold": record.ndwi_threshold,
        "tolerance_pct": record.tolerance_pct,
        "earlier_area_ha": record.earlier_area_ha,
        "later_area_ha": record.later_area_ha,
        "change_ha": record.change_ha,
        "change_pct": record.change_pct,
        "classification": record.classification,
        "classification_reason": record.classification_reason,
        "confidence_score": record.confidence_score,
        "earlier_cloud_cover_pct": record.earlier_cloud_cover_pct,
        "later_cloud_cover_pct": record.later_cloud_cover_pct,
        "earlier_valid_coverage_pct": record.earlier_valid_coverage_pct,
        "later_valid_coverage_pct": record.later_valid_coverage_pct,
        "satellite_sensor": record.satellite_sensor,
        "data_source": record.data_source,
        "earlier_true_color_url": record.earlier_true_color_url,
        "later_true_color_url": record.later_true_color_url,
        "diff_map_url": record.diff_map_url,
    }

    try:
        pdf_bytes = generate_change_detection_pdf_bytes(rec_dict)
    except Exception as e:
        return create_error_response(status_code=500, code="PDF_ERROR", message=f"Failed to generate PDF: {str(e)}")

    filename = f"jalrakshak_satellite_report_{wb.id}_{record.earlier_date}_{record.later_date}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

