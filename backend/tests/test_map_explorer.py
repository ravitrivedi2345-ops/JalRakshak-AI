"""
Tests for Interactive Watershed Map Explorer API Endpoints
Verifies layer registry, administrative boundaries, watersheds, hydrology,
interventions, multi-entity search, and feature detail retrieval.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_map_layers():
    """Verify map layer registry returns all configured administrative, hydrological, and intervention layers."""
    response = client.get("/api/v1/map/layers")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    layers = data["data"]
    assert len(layers) >= 10

    categories = {l["category"] for l in layers}
    assert "administrative" in categories
    assert "hydrological" in categories
    assert "interventions" in categories

    layer_ids = [l["id"] for l in layers]
    assert "admin-national" in layer_ids
    assert "admin-states" in layer_ids
    assert "admin-districts" in layer_ids
    assert "hydro-watersheds" in layer_ids
    assert "hydro-rivers" in layer_ids
    assert "hydro-waterbodies" in layer_ids
    assert "interventions-checkdams" in layer_ids
    assert "interventions-farmponds" in layer_ids


def test_get_administrative_boundaries():
    """Verify administrative boundaries endpoint returns GeoJSON FeatureCollections for national, state, and district levels."""
    # All levels
    resp = client.get("/api/v1/map/boundaries/administrative?level=all")
    assert resp.status_code == 200
    fc = resp.json()["data"]
    assert fc["type"] == "FeatureCollection"
    assert len(fc["features"]) > 5

    # State level only
    resp_states = client.get("/api/v1/map/boundaries/administrative?level=state")
    assert resp_states.status_code == 200
    states_fc = resp_states.json()["data"]
    assert states_fc["type"] == "FeatureCollection"
    for feat in states_fc["features"]:
        assert feat["properties"]["entity_type"] == "state"
        assert feat["geometry"]["type"] == "Polygon"

    # District level only
    resp_dist = client.get("/api/v1/map/boundaries/administrative?level=district")
    assert resp_dist.status_code == 200
    dist_fc = resp_dist.json()["data"]
    for feat in dist_fc["features"]:
        assert feat["properties"]["entity_type"] == "district"
        assert "state" in feat["properties"]


def test_get_watershed_boundaries():
    """Verify watershed boundaries return valid polygons with area, drainage density, and sub-watersheds."""
    resp = client.get("/api/v1/map/boundaries/watersheds")
    assert resp.status_code == 200
    fc = resp.json()["data"]
    assert fc["type"] == "FeatureCollection"
    assert len(fc["features"]) >= 4

    patna_ws = next((f for f in fc["features"] if "patna" in f["id"].lower()), None)
    assert patna_ws is not None
    assert patna_ws["properties"]["state"] == "Bihar"
    assert patna_ws["properties"]["area_sq_km"] > 1000
    assert "sub_watersheds" in patna_ws["properties"]


def test_get_hydrology_features():
    """Verify rivers, drainage channels, and surface water bodies return valid geometry types."""
    # Rivers
    resp_riv = client.get("/api/v1/map/hydrology?type=rivers")
    assert resp_riv.status_code == 200
    riv_fc = resp_riv.json()["data"]
    for feat in riv_fc["features"]:
        assert feat["geometry"]["type"] == "LineString"
        assert feat["properties"]["entity_type"] == "river"
        assert "stream_order" in feat["properties"]

    # Water bodies
    resp_wb = client.get("/api/v1/map/hydrology?type=waterbodies")
    assert resp_wb.status_code == 200
    wb_fc = resp_wb.json()["data"]
    for feat in wb_fc["features"]:
        assert feat["geometry"]["type"] == "Polygon"
        assert feat["properties"]["entity_type"] == "waterbody"
        assert feat["properties"]["area_hectares"] > 0


def test_get_interventions():
    """Verify check dams, farm ponds, and percolation tanks are returned with valid point coordinates."""
    resp = client.get("/api/v1/map/interventions")
    assert resp.status_code == 200
    fc = resp.json()["data"]
    assert fc["type"] == "FeatureCollection"
    assert len(fc["features"]) >= 6

    for feat in fc["features"]:
        assert feat["geometry"]["type"] == "Point"
        assert len(feat["geometry"]["coordinates"]) == 2
        assert feat["properties"]["entity_type"] == "intervention"
        assert "status" in feat["properties"]


def test_search_map_entities():
    """Verify geographic search across state names, district names, watershed names, and coordinates."""
    # Search by State
    r_state = client.get("/api/v1/map/search?q=Bihar")
    assert r_state.status_code == 200
    res = r_state.json()["data"]["results"]
    assert len(res) > 0
    assert any(item["category"] == "state" for item in res)

    # Search by District
    r_dist = client.get("/api/v1/map/search?q=Patna")
    assert r_dist.status_code == 200
    res_dist = r_dist.json()["data"]["results"]
    assert len(res_dist) > 0
    assert any(item["category"] == "district" for item in res_dist)

    # Search by Watershed ID or keyword
    r_ws = client.get("/api/v1/map/search?q=Luni")
    assert r_ws.status_code == 200
    res_ws = r_ws.json()["data"]["results"]
    assert len(res_ws) > 0

    # Search by Lat/Lon coordinate
    r_coord = client.get("/api/v1/map/search?q=25.5941,85.1376")
    assert r_coord.status_code == 200
    res_coord = r_coord.json()["data"]["results"]
    assert len(res_coord) > 0
    assert res_coord[0]["category"] == "coordinate"
    assert res_coord[0]["center"] == [85.1376, 25.5941]


def test_get_feature_detail_view():
    """Verify feature detail retrieval for state, district, watershed, and waterbody, and 404 handling."""
    # Valid State
    r_state = client.get("/api/v1/map/features/state/state-bihar")
    assert r_state.status_code == 200
    assert r_state.json()["data"]["name"] == "Bihar"

    # Valid District
    r_dist = client.get("/api/v1/map/features/district/dist-patna")
    assert r_dist.status_code == 200
    assert r_dist.json()["data"]["headquarters"] == "Patna"

    # Valid Watershed
    r_ws = client.get("/api/v1/map/features/watershed/WS-GANGA-PATNA-01")
    assert r_ws.status_code == 200
    assert "Ganga" in r_ws.json()["data"]["name"]

    # Valid Waterbody
    r_wb = client.get("/api/v1/map/features/waterbody/wb-patna-001")
    assert r_wb.status_code == 200
    assert "Sanjay Gandhi" in r_wb.json()["data"]["name"]

    # Invalid Feature
    r_404 = client.get("/api/v1/map/features/watershed/non-existent-id-999")
    assert r_404.status_code == 404
