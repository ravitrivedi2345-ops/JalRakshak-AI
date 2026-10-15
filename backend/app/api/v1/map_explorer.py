"""
JalRakshak AI — Interactive Watershed Map Explorer API Router
Provides spatial endpoints for administrative boundaries, watershed boundaries,
hydrological drainage networks, water bodies, conservation structures, and geographic search.
"""

from typing import Optional, Tuple
from fastapi import APIRouter, Query, Path, status
from app.core.exceptions import create_success_response, create_error_response
from app.services.spatial_data_service import (
    MAP_LAYERS_REGISTRY,
    get_administrative_geojson,
    get_watersheds_geojson,
    get_hydrology_geojson,
    get_interventions_geojson,
    search_geographic_features,
    get_feature_details,
)

router = APIRouter(prefix="/map", tags=["Interactive Watershed Map Explorer"])


def parse_bbox_param(bbox_str: Optional[str]) -> Optional[Tuple[float, float, float, float]]:
    """Parse comma-separated bounding box 'min_lon,min_lat,max_lon,max_lat'."""
    if not bbox_str:
        return None
    try:
        parts = [float(p.strip()) for p in bbox_str.split(",")]
        if len(parts) == 4:
            return (parts[0], parts[1], parts[2], parts[3])
    except Exception:
        pass
    return None


@router.get("/layers")
def get_map_layers():
    """
    Retrieve registered GIS map layers with category, geometry type,
    default visibility, symbology colors, and documented data sources.
    """
    return create_success_response(
        data=MAP_LAYERS_REGISTRY,
        message="GIS map layers registry retrieved successfully"
    )


@router.get("/boundaries/administrative")
def get_administrative_boundaries(
    level: str = Query("all", description="Hierarchy level: 'all', 'country', 'state', 'district'"),
    bbox: Optional[str] = Query(None, description="Optional bounding box 'min_lon,min_lat,max_lon,max_lat'")
):
    """
    Retrieve GeoJSON FeatureCollection of Administrative Boundaries (National, States, Districts)
    with optional viewport bounding-box filtering.
    """
    bbox_parsed = parse_bbox_param(bbox)
    data = get_administrative_geojson(level=level, bbox=bbox_parsed)
    return create_success_response(
        data=data,
        message="Administrative boundaries retrieved successfully"
    )


@router.get("/boundaries/watersheds")
def get_watershed_boundaries(
    basin_id: Optional[str] = Query(None, description="Filter by specific watershed ID"),
    state: Optional[str] = Query(None, description="Filter by state name"),
    district: Optional[str] = Query(None, description="Filter by district name"),
    bbox: Optional[str] = Query(None, description="Optional bounding box 'min_lon,min_lat,max_lon,max_lat'")
):
    """
    Retrieve GeoJSON FeatureCollection of Watershed and Catchment Basins
    with percolation index, area, and sub-watershed associations.
    """
    bbox_parsed = parse_bbox_param(bbox)
    data = get_watersheds_geojson(basin_id=basin_id, state=state, district=district, bbox=bbox_parsed)
    return create_success_response(
        data=data,
        message="Watershed boundaries retrieved successfully"
    )


@router.get("/hydrology")
def get_hydrology_features(
    type: str = Query("all", description="Hydrological type: 'all', 'rivers', 'drainage', 'waterbodies'"),
    bbox: Optional[str] = Query(None, description="Optional bounding box 'min_lon,min_lat,max_lon,max_lat'")
):
    """
    Retrieve GeoJSON FeatureCollection of Rivers, Drainage Networks, and Water Bodies
    with stream orders, lengths, and surface areas.
    """
    bbox_parsed = parse_bbox_param(bbox)
    data = get_hydrology_geojson(hydro_type=type, bbox=bbox_parsed)
    return create_success_response(
        data=data,
        message="Hydrological features retrieved successfully"
    )


@router.get("/interventions")
def get_interventions_features(
    kind: Optional[str] = Query(None, description="Filter by intervention kind ('check dam', 'farm pond', 'percolation tank')"),
    status: Optional[str] = Query(None, description="Filter by status ('verified', 'needs verification', 'monitoring')"),
    district: Optional[str] = Query(None, description="Filter by district name"),
    bbox: Optional[str] = Query(None, description="Optional bounding box 'min_lon,min_lat,max_lon,max_lat'")
):
    """
    Retrieve GeoJSON FeatureCollection of Watershed Interventions
    (Check dams, Farm ponds, Percolation tanks, Traditional Ahar-Pynes).
    """
    bbox_parsed = parse_bbox_param(bbox)
    data = get_interventions_geojson(kind=kind, status=status, district=district, bbox=bbox_parsed)
    return create_success_response(
        data=data,
        message="Watershed interventions retrieved successfully"
    )


@router.get("/search")
def search_map_entities(
    q: str = Query(..., description="Search query string (State, District, Village, Watershed ID, or Lat,Lon coordinates)"),
    limit: int = Query(10, ge=1, le=50, description="Maximum results to return")
):
    """
    Universal geographic search across States, Districts, Watersheds, Rivers, Waterbodies,
    and WGS84 Lat/Lon coordinate strings.
    """
    results = search_geographic_features(query_str=q, limit=limit)
    return create_success_response(
        data={
            "query": q,
            "count": len(results),
            "results": results
        },
        message=f"Found {len(results)} matching geographic features" if results else "No matching geographic features found"
    )


@router.get("/features/{feature_type}/{feature_id}")
def get_feature_detail_view(
    feature_type: str = Path(..., description="Feature category ('state', 'district', 'watershed', 'river', 'waterbody', 'intervention')"),
    feature_id: str = Path(..., description="Unique feature identifier")
):
    """
    Retrieve comprehensive details, metrics, bounding box, and inspection status
    for any selected map feature.
    """
    detail = get_feature_details(feature_type=feature_type, feature_id=feature_id)
    if not detail:
        return create_error_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"Map feature '{feature_id}' of type '{feature_type}' not found"
        )

    return create_success_response(
        data=detail,
        message="Feature details retrieved successfully"
    )
