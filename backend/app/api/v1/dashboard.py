from fastapi import APIRouter
from app.core.exceptions import create_success_response

router = APIRouter(tags=["Dashboard"])

@router.get("/dashboard/summary")
def get_dashboard_summary():
    data = {
        "kpis": [
            {"label": "Watershed sites", "value": 12480, "suffix": "", "delta": "Illustrative national sample", "tone": "forest"},
            {"label": "Water retained", "value": 84.2, "suffix": " M m³", "delta": "Estimate across sample basins", "tone": "aqua"},
            {"label": "Vegetation health", "value": 74, "suffix": "/100", "delta": "NDVI baseline", "tone": "lime"},
            {"label": "Field checks due", "value": 420, "suffix": "", "delta": "Across sample states", "tone": "amber"}
        ],
        "mode": "connected"
    }
    return create_success_response(data=data)

@router.get("/dashboard/trends")
def get_dashboard_trends():
    trends = [
        {"month": "Feb", "ndvi": 0.39, "ndwi": 0.20},
        {"month": "Mar", "ndvi": 0.43, "ndwi": 0.23},
        {"month": "Apr", "ndvi": 0.48, "ndwi": 0.25},
        {"month": "May", "ndvi": 0.51, "ndwi": 0.30},
        {"month": "Jun", "ndvi": 0.57, "ndwi": 0.34},
        {"month": "Jul", "ndvi": 0.63, "ndwi": 0.40}
    ]
    return create_success_response(data=trends)

@router.get("/dashboard/alerts")
def get_dashboard_alerts():
    alerts = [
        {"id": "alt-1", "title": "Barmer Farm Pond needs field verification", "severity": "high", "timestamp": "2 hours ago", "site_id": "barmer"},
        {"id": "alt-2", "title": "Darrang Check Dam location cross-check pending", "severity": "medium", "timestamp": "5 hours ago", "site_id": "darrang"}
    ]
    return create_success_response(data=alerts)

@router.get("/dashboard/recent-activity")
def get_recent_activity():
    activity = [
        {"id": "act-1", "title": "Field photo uploaded", "type": "upload", "actor": "Ravi Trivedi", "timestamp": "10 mins ago"},
        {"id": "act-2", "title": "AI inference completed", "type": "ai", "actor": "System", "timestamp": "25 mins ago"}
    ]
    return create_success_response(data=activity)

@router.get("/analytics/interventions")
def get_intervention_analytics():
    data = [
        {"label": "Check dams", "total": 3820, "percent": 84, "color": "#28764e"},
        {"label": "Farm ponds", "total": 3140, "percent": 69, "color": "#39a5c2"},
        {"label": "Contour trenches", "total": 2760, "percent": 56, "color": "#65a30d"},
        {"label": "Plantations", "total": 1640, "percent": 34, "color": "#d97706"}
    ]
    return create_success_response(data=data)

@router.get("/analytics/vegetation")
def get_vegetation_analytics():
    return create_success_response(data={"vegetated_area_change_percent": 6.4, "exposed_soil_change_percent": -2.1})

@router.get("/analytics/water")
def get_water_analytics():
    return create_success_response(data={"water_body_change_percent": 3.7, "total_retained_m_m3": 84.2})
