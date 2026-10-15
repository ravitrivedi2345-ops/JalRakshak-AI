import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_satellite_availability_valid():
    response = client.get("/api/v1/waterbodies/wb-patna-001/satellite-availability")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    data = payload["data"]
    assert data["waterbody_id"] == "wb-patna-001"
    assert data["waterbody_name"] == "Mangal Talab"
    assert data["tile"] == "T45RTT"
    assert data["total_scenes_available"] > 0
    assert len(data["scenes"]) > 0

    first_scene = data["scenes"][0]
    assert "scene_id" in first_scene
    assert "acquisition_date" in first_scene
    assert "cloud_cover_percent" in first_scene
    assert "suitability" in first_scene
    assert first_scene["resolution_m"] == 10.0


def test_satellite_availability_not_found():
    response = client.get("/api/v1/waterbodies/wb-invalid-99999/satellite-availability")
    assert response.status_code == 404
    payload = response.json()
    assert payload["success"] is False


def test_change_detection_invalid_date_order():
    # earlier_date is after later_date
    req_body = {
        "earlier_date": "2025-10-23",
        "later_date": "2025-05-21",
        "ndwi_threshold": 0.0
    }
    response = client.post("/api/v1/waterbodies/wb-patna-001/change-detection", json=req_body)
    assert response.status_code == 400
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "INVALID_DATES"


def test_change_detection_execution_and_persistence():
    req_body = {
        "earlier_date": "2025-05-21",
        "later_date": "2025-10-23",
        "ndwi_threshold": 0.0,
        "tolerance_pct": 3.0,
        "min_change_ha": 0.03,
        "save_to_history": True,
        "record_measurement": True
    }
    response = client.post("/api/v1/waterbodies/wb-patna-001/change-detection", json=req_body)
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    data = payload["data"]

    assert data["waterbody_id"] == "wb-patna-001"
    assert data["earlier_date"] == "2025-05-21"
    assert data["later_date"] == "2025-10-23"
    assert "earlier_area_ha" in data
    assert "later_area_ha" in data
    assert "change_ha" in data
    assert data["classification"] in ("expansion", "shrinkage", "stable", "inconclusive")
    assert data["confidence_score"] > 50.0

    # Ensure actual satellite images/masks are generated as base64 data URIs
    assert data["earlier_true_color_url"].startswith("data:image/png;base64,")
    assert data["later_true_color_url"].startswith("data:image/png;base64,")
    assert data["diff_map_url"].startswith("data:image/png;base64,")
    assert "metadata" in data
    assert data["id"] is not None

    run_id = data["id"]

    # Check history endpoint
    hist_resp = client.get("/api/v1/waterbodies/wb-patna-001/change-detection/history")
    assert hist_resp.status_code == 200
    hist_data = hist_resp.json()["data"]
    assert hist_data["total_runs"] >= 1
    found = any(item["id"] == run_id for item in hist_data["history"])
    assert found is True

    # Test CSV Export
    csv_resp = client.get(f"/api/v1/waterbodies/wb-patna-001/change-detection/{run_id}/export-csv")
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers.get("content-type", "")
    csv_text = csv_resp.text
    assert "JalRakshak AI" in csv_text
    assert "Mangal Talab" in csv_text
    assert "NDWI Threshold" in csv_text

    # Test PDF Export
    pdf_resp = client.get(f"/api/v1/waterbodies/wb-patna-001/change-detection/{run_id}/export-pdf")
    assert pdf_resp.status_code == 200
    assert "application/pdf" in pdf_resp.headers.get("content-type", "")
    assert pdf_resp.content.startswith(b"%PDF-")


def test_change_detection_custom_threshold():
    # Test with custom NDWI threshold of 0.15 (more restrictive open water)
    req_body = {
        "earlier_date": "2025-03-22",
        "later_date": "2025-11-17",
        "ndwi_threshold": 0.15,
        "tolerance_pct": 5.0,
        "save_to_history": False
    }
    response = client.post("/api/v1/waterbodies/wb-patna-002/change-detection", json=req_body)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["ndwi_threshold"] == 0.15
    assert data["tolerance_pct"] == 5.0
    assert data["waterbody_name"] == "Sanjay Gandhi Jaivik Udyan Lake"


def test_api_compatibility_alias():
    # Verify that the direct route /api/waterbodies/... works without /v1
    response = client.get("/api/waterbodies/wb-patna-001/satellite-availability")
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_satellite_cron_status():
    response = client.get("/api/v1/waterbodies/satellite-cron/status")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["target_tile"] == "T45RTT"
    assert data["polling_interval_days"] == 5
    assert data["status"] == "active"
    assert data["shrinkage_alert_threshold_pct"] == 10.0


def test_satellite_cron_trigger():
    response = client.post("/api/v1/waterbodies/satellite-cron/trigger")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "success"
    assert data["tile_id"] == "T45RTT"
    assert data["waterbodies_processed"] > 0


def test_subpixel_hybrid_fusion():
    payload = {
        "observation_date": "2026-04-16",
        "ndwi_threshold": 0.0,
        "target_sensor": "PlanetScope / UAV Super-Resolution (3m)"
    }
    response = client.post("/api/v1/waterbodies/wb-patna-001/subpixel-fusion", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["waterbody_id"] == "wb-patna-001"
    assert data["fused_resolution_m"] < 5.0
    assert "measurements" in data
    assert "standard_sentinel2_10m_area_ha" in data["measurements"]
    assert "fused_high_res_3m_area_ha" in data["measurements"]
    assert data["visuals"]["fused_true_color_url"].startswith("data:image/png;base64,")
    assert data["visuals"]["subpixel_fraction_url"].startswith("data:image/png;base64,")


def test_bathymetry_profile_and_volumetric_calculation():
    response = client.get("/api/v1/waterbodies/wb-patna-001/bathymetry?surface_area_ha=4.2")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["waterbody_id"] == "wb-patna-001"
    assert "sensor_metadata" in data
    assert "coupled_metrics" in data
    assert data["coupled_metrics"]["computed_volume_m3"] > 0
    assert data["coupled_metrics"]["storage_capacity_m3"] > 0
    assert len(data["trend"]) > 0


def test_bathymetry_record_reading():
    payload = {
        "water_level_m": 2.45,
        "surface_area_ha": 4.1,
        "sensor_type": "ultrasonic_depth_gauge",
        "sensor_id": "US-PATNA-001",
        "notes": "Field validation sonar check"
    }
    response = client.post("/api/v1/waterbodies/wb-patna-001/bathymetry/record", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["water_level_m"] == 2.45
    assert data["computed_volume_m3"] > 0
    assert "volume_percentage" in data

