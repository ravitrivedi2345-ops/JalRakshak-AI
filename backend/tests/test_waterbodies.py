def test_get_waterbodies_summary(client):
    response = client.get("/api/v1/waterbodies/summary?district=Patna")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    summary = data["data"]
    assert summary["district"] == "Patna"
    assert summary["state"] == "Bihar"
    assert summary["total_waterbodies"] >= 15
    assert "by_status" in summary
    assert "by_priority" in summary
    assert summary["total_area_hectares"] > 0


def test_list_waterbodies_default(client):
    response = client.get("/api/v1/waterbodies")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    items = data["data"]["items"]
    assert len(items) >= 15
    first = items[0]
    assert "id" in first
    assert "name" in first
    assert "latitude" in first
    assert "longitude" in first
    assert "inspection_status" in first


def test_list_waterbodies_search(client):
    response = client.get("/api/v1/waterbodies?q=Mangal")
    assert response.status_code == 200
    items = response.json()["data"]["items"]
    assert len(items) == 1
    assert "Mangal Talab" in items[0]["name"]


def test_list_waterbodies_filter_priority(client):
    response = client.get("/api/v1/waterbodies?priority=high")
    assert response.status_code == 200
    items = response.json()["data"]["items"]
    assert len(items) > 0
    for item in items:
        assert item["priority"] == "high"


def test_list_waterbodies_geojson_format(client):
    response = client.get("/api/v1/waterbodies?format=geojson")
    assert response.status_code == 200
    geojson = response.json()["data"]
    assert geojson["type"] == "FeatureCollection"
    assert len(geojson["features"]) >= 15
    for feat in geojson["features"]:
        assert feat["type"] == "Feature"
        assert "geometry" in feat
        assert "properties" in feat


def test_get_waterbody_detail(client):
    response = client.get("/api/v1/waterbodies/wb-patna-001")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    wb = data["data"]
    assert wb["id"] == "wb-patna-001"
    assert wb["name"] == "Mangal Talab"
    assert wb["district"] == "Patna"
    assert wb["has_polygon"] is True


def test_get_waterbody_not_found(client):
    response = client.get("/api/v1/waterbodies/non-existent-id-999")
    assert response.status_code == 404
    assert response.json()["success"] is False


def test_get_waterbody_history(client):
    response = client.get("/api/v1/waterbodies/wb-patna-001/history")
    assert response.status_code == 200
    hist = response.json()["data"]
    assert hist["waterbody_id"] == "wb-patna-001"
    assert hist["has_history"] is True
    assert hist["measurement_trend_available"] is True
    assert len(hist["inspections"]) > 0
    assert len(hist["measurements"]) >= 2


def test_get_waterbody_history_uninspected(client):
    response = client.get("/api/v1/waterbodies/wb-patna-013/history")
    assert response.status_code == 200
    hist = response.json()["data"]
    assert hist["waterbody_id"] == "wb-patna-013"
    assert hist["has_history"] is False
    assert hist["measurement_trend_available"] is False
    assert len(hist["inspections"]) == 0


def test_api_compatibility_alias(client):
    # Test that /api/waterbodies works without /v1 prefix
    response = client.get("/api/waterbodies/summary")
    assert response.status_code == 200
    assert response.json()["success"] is True
