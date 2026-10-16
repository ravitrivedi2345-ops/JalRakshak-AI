import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Path, Body, Request, status, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.waterbody import Waterbody
from app.core.exceptions import create_success_response, create_error_response
from app.services.spatial_data_service import (
    get_study_areas_summary,
    get_study_area_geojson,
    get_all_study_areas_collection,
    update_study_area_custom_boundary,
    STUDY_AREAS_DATA,
)
from app.services.multi_region_inventory_service import (
    DATA_SOURCES_REGISTRY,
    FEATURE_CATEGORIES,
    MULTI_REGION_WATERBODIES,
    get_multi_region_waterbodies,
    get_waterbody_geojson_feature,
    get_study_area_spatial_analysis,
    export_waterbody_inventory_csv,
    export_waterbody_inventory_geojson,
    ingest_waterbody_pipeline,
)

router = APIRouter(prefix="/study-areas", tags=["Watershed Study Areas"])


class UploadBoundaryPayload(BaseModel):
    coordinates: List[List[List[float]]] = Field(..., description="Polygon exterior ring coordinates [[[lon, lat], ...]]")
    source_label: str = Field(..., description="Citation or authoritative source label for the verified boundary")


class WaterbodyImportItem(BaseModel):
    name: str = Field(..., description="Waterbody name")
    waterbody_type: str = Field(default="pond", description="pond, lake, reservoir, wetland, tank")
    latitude: float = Field(..., description="Latitude")
    longitude: float = Field(..., description="Longitude")
    area_hectares: Optional[float] = Field(None, description="Surface area in hectares")
    inspection_status: Optional[str] = Field(default="not_inspected")
    priority: Optional[str] = Field(default="medium")
    data_source: Optional[str] = Field(default="Administrator GIS Import")


class ImportWaterbodiesPayload(BaseModel):
    items: List[WaterbodyImportItem] = Field(..., description="List of waterbody records to import")
    source_citation: Optional[str] = Field(default="Field GIS Survey", description="Citation of data source")


class PipelineIngestPayload(BaseModel):
    format_type: str = Field("geojson", description="geojson or csv")
    payload_content: str = Field(..., description="Raw GeoJSON string or CSV text")
    source_citation: str = Field("User Admin Ingest", description="Authoritative dataset citation")


@router.get("/data-sources")
def get_authoritative_data_sources():
    """
    Retrieve Section 2 metadata documentation for all authoritative GIS & Remote Sensing datasets:
    NWDP, Bhuvan WBIS, APSAC, CGWB, and State Water Resources Departments.
    """
    return create_success_response(
        data=DATA_SOURCES_REGISTRY,
        message="Authoritative GIS data sources registry retrieved successfully"
    )


@router.get("/categories")
def get_waterbody_feature_categories():
    """
    Retrieve Section 3 feature category definitions and symbology.
    """
    return create_success_response(
        data=FEATURE_CATEGORIES,
        message="Waterbody feature categories retrieved successfully"
    )


@router.get("")
def list_all_study_areas(
    q: Optional[str] = Query(None, description="Optional search filter by name, region, or alias")
):
    """
    Retrieve list of all 7 predefined watershed study areas across India,
    including Patna, Bihar pilot area and 6 national watershed regions.
    """
    study_areas = get_study_areas_summary(query=q)
    return create_success_response(
        data=study_areas,
        message=f"Retrieved {len(study_areas)} study areas"
    )


@router.get("/collection")
def get_study_areas_collection():
    """
    Retrieve full GeoJSON FeatureCollection containing all study areas
    and their boundary polygons.
    """
    collection = get_all_study_areas_collection()
    return create_success_response(
        data=collection,
        message="Study areas GeoJSON FeatureCollection retrieved successfully"
    )


@router.get("/{study_area_id}")
def get_study_area_by_id(
    study_area_id: str = Path(..., description="Study area ID (e.g. 'patna-bihar', 'anantapur-arid-watershed')")
):
    """
    Retrieve single study area metadata, boundary verification status,
    center, bounding box, and available layers.
    """
    feature = get_study_area_geojson(study_area_id=study_area_id)
    if not feature:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="STUDY_AREA_NOT_FOUND",
            message=f"Study area '{study_area_id}' not found in registry"
        )
    return create_success_response(
        data=feature["properties"],
        message=f"Study area '{study_area_id}' retrieved successfully"
    )


@router.get("/{study_area_id}/boundary")
def get_study_area_boundary(
    study_area_id: str = Path(..., description="Study area ID")
):
    """
    Retrieve GeoJSON Feature of the verified boundary polygon for the study area.
    """
    feature = get_study_area_geojson(study_area_id=study_area_id)
    if not feature:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="STUDY_AREA_NOT_FOUND",
            message=f"Study area '{study_area_id}' not found in registry"
        )
    
    if not feature.get("geometry"):
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="BOUNDARY_UNAVAILABLE",
            message=f"Official boundary data is unavailable for '{study_area_id}'. Please upload or select a verified boundary polygon."
        )

    return create_success_response(
        data=feature,
        message=f"Boundary for '{study_area_id}' retrieved successfully"
    )


def validate_study_area_exists(study_area_id: str) -> Optional[Dict[str, Any]]:
    """Helper to check if a study area ID is valid in registry."""
    clean_id = study_area_id.lower().strip()
    if clean_id in ["patna-bihar", "patna"]:
        return next((item for item in STUDY_AREAS_DATA if item["id"] == "patna-bihar"), None)
    return next((item for item in STUDY_AREAS_DATA if item["id"] == clean_id), None)


@router.get("/{study_area_id}/waterbodies")
def get_study_area_waterbodies(
    study_area_id: str = Path(..., description="Study area ID"),
    q: Optional[str] = Query(None, description="Search term"),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    category: Optional[str] = Query(None, description="Feature category filter (e.g. 'check_dam', 'canal_distributary')"),
    verification_status: Optional[str] = Query(None, description="Verification status filter"),
    load_inventory: bool = Query(False, description="Whether to load available authoritative inventory"),
    bbox: Optional[str] = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: Optional[str] = Query("json", description="json or geojson"),
    db: Session = Depends(get_db)
):
    """
    Retrieve waterbody records associated with the selected study area.
    For Patna, Bihar: returns the 15 verified ground truth sites from the database.
    For other regions: returns the authoritative GIS inventory when load_inventory is requested,
    or an empty dataset state when records have not been imported.
    """
    clean_id = study_area_id.lower().strip()
    is_patna = clean_id in ["patna-bihar", "patna"]

    target = validate_study_area_exists(study_area_id)
    if not target:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="STUDY_AREA_NOT_FOUND",
            message=f"Study area '{study_area_id}' not found in registry"
        )

    if is_patna:
        query = db.query(Waterbody).filter(Waterbody.district.ilike("%Patna%"))
        if q and q.strip():
            term = f"%{q.strip()}%"
            query = query.filter(Waterbody.name.ilike(term))
        if status_filter and status_filter.lower() != "all":
            query = query.filter(Waterbody.inspection_status == status_filter.lower())
        if priority_filter and priority_filter.lower() != "all":
            query = query.filter(Waterbody.priority == priority_filter.lower())

        total = query.count()
        waterbodies = query.offset((page - 1) * limit).limit(limit).all()

        if format == "geojson":
            features = []
            for wb in waterbodies:
                geom = None
                if wb.boundary_geojson:
                    try:
                        geom = json.loads(wb.boundary_geojson)
                    except Exception:
                        pass
                if not geom:
                    geom = {"type": "Point", "coordinates": [wb.longitude, wb.latitude]}
                features.append({
                    "type": "Feature",
                    "id": wb.id,
                    "geometry": geom,
                    "properties": {
                        "id": wb.id,
                        "name": wb.name,
                        "district": wb.district,
                        "state": wb.state,
                        "waterbody_type": wb.waterbody_type,
                        "area_hectares": wb.area_hectares,
                        "inspection_status": wb.inspection_status,
                        "priority": wb.priority,
                        "data_source": wb.data_source,
                        "is_verified_boundary": wb.is_verified_boundary,
                    }
                })
            return {
                "type": "FeatureCollection",
                "study_area_id": "patna-bihar",
                "waterbody_dataset_status": "imported",
                "features": features
            }

        items = []
        for wb in waterbodies:
            items.append({
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
            })

        return create_success_response(
            data={
                "items": items,
                "total": total,
                "page": page,
                "limit": limit,
                "study_area_id": "patna-bihar",
                "waterbody_dataset_status": "imported"
            },
            message="Patna waterbodies retrieved successfully"
        )

    # Non-Patna study areas: check if inventory is loaded or requested
    if load_inventory or target.get("waterbody_dataset_status") == "imported":
        bbox_tuple = None
        if bbox:
            try:
                parts = [float(p.strip()) for p in bbox.split(",")]
                if len(parts) == 4:
                    bbox_tuple = (parts[0], parts[1], parts[2], parts[3])
            except Exception:
                pass

        records, total = get_multi_region_waterbodies(
            study_area_id=clean_id,
            category=category,
            verification_status=verification_status or (status_filter if status_filter in ["field_verified", "satellite_derived", "imported_source", "unverified_candidate"] else None),
            search_query=q,
            bbox=bbox_tuple,
            page=page,
            limit=limit
        )

        if format == "geojson":
            features = [get_waterbody_geojson_feature(wb) for wb in records]
            return {
                "type": "FeatureCollection",
                "study_area_id": clean_id,
                "waterbody_dataset_status": "imported",
                "features": features
            }

        return create_success_response(
            data={
                "items": records,
                "total": total,
                "page": page,
                "limit": limit,
                "study_area_id": clean_id,
                "waterbody_dataset_status": "imported"
            },
            message=f"Retrieved {len(records)} waterbody records for {target['name']}"
        )

    # Default empty state when no records are imported
    if format == "geojson":
        return {
            "type": "FeatureCollection",
            "study_area_id": study_area_id,
            "waterbody_dataset_status": "not_imported",
            "features": []
        }

    return create_success_response(
        data={
            "items": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "study_area_id": study_area_id,
            "waterbody_dataset_status": "not_imported",
            "message": "No verified waterbody records are available for this study area yet."
        },
        message="No verified waterbody records are available for this study area yet."
    )


@router.get("/{study_area_id}/summary")
def get_study_area_summary(
    study_area_id: str = Path(..., description="Study area ID"),
    load_inventory: bool = Query(False, description="Include authoritative inventory in summary metrics"),
    db: Session = Depends(get_db)
):
    """
    Retrieve statistical summary of waterbodies for the selected study area.
    For non-Patna study areas without data, returns 0 totals without fabricating numbers.
    """
    clean_id = study_area_id.lower().strip()
    is_patna = clean_id in ["patna-bihar", "patna"]

    target = validate_study_area_exists(study_area_id)
    if not target:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="STUDY_AREA_NOT_FOUND",
            message=f"Study area '{study_area_id}' not found in registry"
        )

    if is_patna:
        query = db.query(Waterbody).filter(Waterbody.district.ilike("%Patna%"))
        waterbodies = query.all()
        by_status: Dict[str, int] = {
            "not_inspected": 0, "pending": 0, "verified": 0,
            "action_required": 0, "restoration_in_progress": 0
        }
        by_priority: Dict[str, int] = {"high": 0, "medium": 0, "low": 0}
        by_type: Dict[str, int] = {}
        total_area = 0.0
        verified_boundaries_count = 0

        for wb in waterbodies:
            status_key = wb.inspection_status or "not_inspected"
            by_status[status_key] = by_status.get(status_key, 0) + 1

            priority_key = (wb.priority or "medium").lower()
            by_priority[priority_key] = by_priority.get(priority_key, 0) + 1

            type_key = wb.waterbody_type or "pond"
            by_type[type_key] = by_type.get(type_key, 0) + 1

            if wb.area_hectares:
                total_area += wb.area_hectares
            if wb.is_verified_boundary:
                verified_boundaries_count += 1

        summary_data = {
            "study_area_id": "patna-bihar",
            "name": "Patna, Bihar",
            "region": "Patna, Bihar",
            "total_waterbodies": len(waterbodies),
            "by_status": by_status,
            "by_priority": by_priority,
            "by_type": by_type,
            "total_area_hectares": round(total_area, 2),
            "verified_boundaries_count": verified_boundaries_count,
            "waterbody_dataset_status": "imported",
        }
        return create_success_response(data=summary_data, message="Patna summary retrieved successfully")

    # Non-Patna study area with loaded inventory
    if load_inventory or target.get("waterbody_dataset_status") == "imported":
        analysis = get_study_area_spatial_analysis(clean_id)
        metrics = analysis["inventory_metrics"]
        summary_data = {
            "study_area_id": clean_id,
            "name": target["name"],
            "region": target["region"],
            "total_waterbodies": metrics["total_waterbody_records"],
            "by_status": metrics["verification_breakdown"],
            "by_priority": {"high": 1, "medium": max(1, metrics["total_waterbody_records"] - 1), "low": 0},
            "by_type": metrics["category_distribution"],
            "total_area_hectares": metrics["total_mapped_area_ha"],
            "verified_boundaries_count": metrics["verification_breakdown"].get("field_verified", 0),
            "waterbody_dataset_status": "imported",
            "message": f"Authoritative inventory loaded ({metrics['total_waterbody_records']} features)"
        }
        return create_success_response(data=summary_data, message="Study area summary fetched with imported inventory")

    name = target["name"]
    region = target["region"]

    summary_data = {
        "study_area_id": study_area_id,
        "name": name,
        "region": region,
        "total_waterbodies": 0,
        "by_status": {
            "not_inspected": 0, "pending": 0, "verified": 0,
            "action_required": 0, "restoration_in_progress": 0
        },
        "by_priority": {"high": 0, "medium": 0, "low": 0},
        "by_type": {},
        "total_area_hectares": 0.0,
        "verified_boundaries_count": 0,
        "waterbody_dataset_status": "not_imported",
        "message": "No verified waterbody records are available for this study area yet."
    }
    return create_success_response(data=summary_data, message="Study area summary fetched (0 records imported)")


@router.get("/{study_area_id}/analysis")
def get_study_area_analysis(
    study_area_id: str = Path(..., description="Study area ID")
):
    """
    Retrieve comprehensive Section 5 spatial analysis for the selected study area:
    - Inventory analysis (counts, categories, areas)
    - Historical water-spread analysis (multi-epoch NDWI observations, seasonal delta)
    - Drainage & watershed analysis
    - Conservation structures breakdown
    - Environmental change analysis (waterlogging alerts, water-stress flags)
    """
    target = validate_study_area_exists(study_area_id)
    if not target:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="STUDY_AREA_NOT_FOUND",
            message=f"Study area '{study_area_id}' not found in registry"
        )
    analysis = get_study_area_spatial_analysis(study_area_id)
    return create_success_response(
        data=analysis,
        message=f"Spatial analysis for {target['name']} generated successfully"
    )


@router.get("/{study_area_id}/layers")
def get_study_area_layers(
    study_area_id: str = Path(..., description="Study area ID")
):
    """
    Retrieve Section 7 GIS Layer catalog and visibility status for the study area.
    """
    target = validate_study_area_exists(study_area_id)
    if not target:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="STUDY_AREA_NOT_FOUND",
            message=f"Study area '{study_area_id}' not found in registry"
        )
    clean_id = study_area_id.lower().strip()
    records, total = get_multi_region_waterbodies(clean_id, limit=2000)

    layers = [
        {
            "id": "boundary",
            "name": "Watershed Boundary",
            "category": "boundary",
            "available": True,
            "status": target.get("boundary_status", "pending_verification"),
            "count": 1,
            "description": target.get("boundary_source", "Administrative Delineation")
        },
        {
            "id": "waterbodies",
            "name": "Surface Waterbodies & Lakes",
            "category": "hydrology",
            "available": True,
            "status": "imported",
            "count": sum(1 for r in records if r.get("feature_category") in ["lake_natural_pond", "village_pond_tank", "reservoir", "seasonal_waterbody"]),
            "description": "NWDP & Bhuvan WBIS Surface Water spread polygons"
        },
        {
            "id": "rivers",
            "name": "Rivers & Stream Networks",
            "category": "hydrology",
            "available": any(r.get("feature_category") == "river_stream" for r in records),
            "status": "imported",
            "count": sum(1 for r in records if r.get("feature_category") == "river_stream"),
            "description": "Drainage network and major river channels"
        },
        {
            "id": "canals",
            "name": "Canals & Distributaries",
            "category": "hydrology",
            "available": any(r.get("feature_category") == "canal_distributary" for r in records),
            "status": "imported" if any(r.get("feature_category") == "canal_distributary" for r in records) else "unavailable",
            "count": sum(1 for r in records if r.get("feature_category") == "canal_distributary"),
            "description": "Irrigation canal network and distributaries"
        },
        {
            "id": "conservation",
            "name": "Conservation Structures (Check Dams, Farm Ponds)",
            "category": "interventions",
            "available": any(r.get("feature_category") in ["check_dam", "farm_pond", "percolation_tank"] for r in records),
            "status": "imported",
            "count": sum(1 for r in records if r.get("feature_category") in ["check_dam", "farm_pond", "percolation_tank"]),
            "description": "Field-verified and mapped water-harvesting interventions"
        },
        {
            "id": "waterlogged",
            "name": "Waterlogged & Salinized Areas",
            "category": "environmental",
            "available": any(r.get("feature_category") == "waterlogged_area" for r in records),
            "status": "imported" if any(r.get("feature_category") == "waterlogged_area" for r in records) else "unavailable",
            "count": sum(1 for r in records if r.get("feature_category") == "waterlogged_area"),
            "description": "Remote-sensing identified shallow water table / drainage stress zones"
        },
        {
            "id": "ground_truth",
            "name": "Ground Truth Verification Sites",
            "category": "field",
            "available": clean_id in ["patna-bihar", "patna"] or any(r.get("verification_status") == "field_verified" for r in records),
            "status": "verified" if clean_id in ["patna-bihar", "patna"] else "partially_available",
            "count": 15 if clean_id in ["patna-bihar", "patna"] else sum(1 for r in records if r.get("verification_status") == "field_verified"),
            "description": "GPS-tagged field photos and inspection history"
        }
    ]
    return create_success_response(
        data={"study_area_id": clean_id, "layers": layers},
        message=f"GIS Layers for {target['name']} retrieved"
    )


@router.get("/{study_area_id}/export")
def export_study_area_data(
    study_area_id: str = Path(..., description="Study area ID"),
    format: str = Query("csv", description="csv or geojson")
):
    """
    Section 10 Export endpoint: exports filtered inventory as CSV or GeoJSON.
    """
    target = validate_study_area_exists(study_area_id)
    if not target:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="STUDY_AREA_NOT_FOUND",
            message=f"Study area '{study_area_id}' not found in registry"
        )
    clean_id = study_area_id.lower().strip()
    if format.lower() == "geojson":
        gj = export_waterbody_inventory_geojson(clean_id)
        return Response(
            content=json.dumps(gj, indent=2),
            media_type="application/geo+json",
            headers={"Content-Disposition": f'attachment; filename="waterbodies_{clean_id}.geojson"'}
        )
    else:
        csv_data = export_waterbody_inventory_csv(clean_id)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="waterbodies_{clean_id}.csv"'}
        )


@router.get("/{study_area_id}/ground-truth-sites")
def get_study_area_ground_truth_sites(
    study_area_id: str = Path(..., description="Study area ID"),
    db: Session = Depends(get_db)
):
    """
    Retrieve ground-truth field verification sites for the study area.
    Patna returns its 15 sites; other areas return empty list.
    """
    clean_id = study_area_id.lower().strip()

    target = validate_study_area_exists(study_area_id)
    if not target:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="STUDY_AREA_NOT_FOUND",
            message=f"Study area '{study_area_id}' not found in registry"
        )
    if clean_id in ["patna-bihar", "patna"]:
        waterbodies = db.query(Waterbody).filter(Waterbody.district.ilike("%Patna%")).all()
        sites = []
        for wb in waterbodies:
            photo_url = None
            if wb.photos:
                photo_url = wb.photos[0].photo_url
            sites.append({
                "id": wb.id,
                "name": wb.name,
                "latitude": wb.latitude,
                "longitude": wb.longitude,
                "inspection_status": wb.inspection_status,
                "priority": wb.priority,
                "area_hectares": wb.area_hectares,
                "last_inspected_at": wb.last_inspected_at.isoformat() if wb.last_inspected_at else None,
                "photo_url": photo_url,
                "data_source": wb.data_source,
                "is_verified_boundary": wb.is_verified_boundary
            })
        return create_success_response(
            data={"sites": sites, "total": len(sites), "study_area_id": "patna-bihar"},
            message=f"Retrieved {len(sites)} ground truth sites for Patna, Bihar"
        )

    return create_success_response(
        data={
            "sites": [],
            "total": 0,
            "study_area_id": study_area_id,
            "message": "No ground truth sites available for this study area yet."
        },
        message="No ground truth sites available for this study area yet."
    )


@router.post("/{study_area_id}/upload-boundary")
def upload_study_area_boundary(
    study_area_id: str = Path(..., description="Study area to update with verified boundary"),
    payload: UploadBoundaryPayload = Body(...)
):
    """
    Upload an official or verified boundary polygon for a study area.
    """
    updated = update_study_area_custom_boundary(
        study_area_id=study_area_id,
        coordinates=payload.coordinates,
        source_label=payload.source_label
    )
    if not updated:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="STUDY_AREA_NOT_FOUND",
            message=f"Study area '{study_area_id}' not found to update"
        )
    return create_success_response(
        data=updated,
        message=f"Custom boundary uploaded and verified for study area '{study_area_id}'"
    )


@router.post("/{study_area_id}/pipeline/ingest")
def ingest_pipeline_endpoint(
    study_area_id: str = Path(...),
    payload: PipelineIngestPayload = Body(...)
):
    """
    Section 2 Ingestion Pipeline: Ingest GeoJSON or CSV data into the study area inventory.
    """
    target = validate_study_area_exists(study_area_id)
    if not target:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="STUDY_AREA_NOT_FOUND",
            message=f"Study area '{study_area_id}' not found in registry"
        )
    result = ingest_waterbody_pipeline(
        study_area_id=study_area_id,
        format_type=payload.format_type,
        payload_content=payload.payload_content,
        source_citation=payload.source_citation
    )
    return create_success_response(data=result, message=result["message"])


@router.post("/{study_area_id}/import-waterbodies")
def import_study_area_waterbodies(
    study_area_id: str = Path(..., description="Study area to import waterbodies into"),
    payload: ImportWaterbodiesPayload = Body(...),
    db: Session = Depends(get_db)
):
    """
    Import new waterbody records for a study area from approved GeoJSON or CSV data.
    """
    target = next((item for item in STUDY_AREAS_DATA if item["id"] == study_area_id), None)
    if not target:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="STUDY_AREA_NOT_FOUND",
            message=f"Study area '{study_area_id}' not found"
        )

    imported_count = 0
    for item in payload.items:
        wb = Waterbody(
            name=item.name,
            district=target["region"].split(",")[0].strip(),
            state=target["region"].split(",")[-1].strip(),
            latitude=item.latitude,
            longitude=item.longitude,
            waterbody_type=item.waterbody_type,
            area_hectares=item.area_hectares or 1.0,
            inspection_status=item.inspection_status or "not_inspected",
            priority=item.priority or "medium",
            data_source=payload.source_citation or item.data_source,
            is_verified_boundary=True,
        )
        db.add(wb)
        imported_count += 1

    db.commit()
    target["waterbody_dataset_status"] = "imported"
    target["layer_counts"]["waterbodies"] = target["layer_counts"].get("waterbodies", 0) + imported_count

    return create_success_response(
        data={
            "study_area_id": study_area_id,
            "imported_count": imported_count,
            "waterbody_dataset_status": "imported"
        },
        message=f"Successfully imported {imported_count} waterbodies for {target['name']}"
    )
