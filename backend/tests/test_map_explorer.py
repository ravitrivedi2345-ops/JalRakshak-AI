"""
Tests for Interactive Watershed Map Explorer API Endpoints
Verifies layer registry, administrative boundaries, watersheds, hydrology,
interventions, multi-entity search, and feature detail retrieval.
"""

import json
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


def test_study_areas_endpoints():
    """Verify 6 study areas listing, search filtering, GeoJSON retrieval, and custom boundary upload."""
    # 1. List all 6 study areas
    r_list = client.get("/api/v1/map/study-areas")
    assert r_list.status_code == 200
    areas = r_list.json()["data"]
    assert len(areas) == 7

    ids = [a["id"] for a in areas]
    assert "patna-bihar" in ids
    assert "kolar-sub-basin" in ids
    assert "raichur-tungabhadra-catchment" in ids
    assert "anantapur-arid-watershed" in ids
    assert "bundelkhand-recharge-zone" in ids
    assert "vidarbha-basin" in ids
    assert "thar-canal-command-area" in ids

    # 2. Check validation statuses
    patna = next(a for a in areas if a["id"] == "patna-bihar")
    assert patna["boundary_status"] == "verified"
    assert patna["waterbody_dataset_status"] == "imported"
    assert patna["has_ground_truth_records"] is True

    anantapur = next(a for a in areas if a["id"] == "anantapur-arid-watershed")
    assert anantapur["boundary_status"] == "verified"
    assert anantapur["region"] == "Andhra Pradesh"
    assert "Ananthapuramu" in anantapur["aliases"]
    assert anantapur["waterbody_dataset_status"] == "not_imported"

    kolar = next(a for a in areas if a["id"] == "kolar-sub-basin")
    assert kolar["boundary_status"] == "pending_verification"
    assert "Karnataka" in kolar["disambiguation_notes"]

    # 3. Search query
    r_search = client.get("/api/v1/map/study-areas?q=Tungabhadra")
    assert r_search.status_code == 200
    search_data = r_search.json()["data"]
    assert len(search_data) == 1
    assert search_data[0]["id"] == "raichur-tungabhadra-catchment"

    # 4. Single GeoJSON detail
    r_detail = client.get("/api/v1/map/study-areas/bundelkhand-recharge-zone")
    assert r_detail.status_code == 200
    feat = r_detail.json()["data"]
    assert feat["type"] == "Feature"
    assert feat["geometry"]["type"] == "Polygon"
    assert feat["properties"]["name"] == "Bundelkhand Recharge Zone"
    assert len(feat["properties"]["bbox"]) == 4

    # 5. Full Collection
    r_coll = client.get("/api/v1/map/study-areas/collection")
    assert r_coll.status_code == 200
    coll = r_coll.json()["data"]
    assert coll["type"] == "FeatureCollection"
    assert len(coll["features"]) == 7

    # 6. Upload boundary update
    new_coords = [[[76.80, 22.70], [77.35, 22.70], [77.40, 23.05], [76.80, 23.05], [76.80, 22.70]]]
    r_upload = client.post(
        "/api/v1/map/study-areas/kolar-sub-basin/upload-boundary",
        json={"coordinates": new_coords, "source_label": "SLUSI Verified 2026 Survey"}
    )
    assert r_upload.status_code == 200
    up_data = r_upload.json()["data"]
    assert up_data["properties"]["boundary_status"] == "verified_custom"
    assert "SLUSI" in up_data["properties"]["boundary_source"]


def test_dedicated_study_areas_api():
    """Verify Section 6 proposed study-area endpoints and waterbody separation."""
    # 1. Direct /api/study-areas
    r_list = client.get("/api/study-areas")
    assert r_list.status_code == 200
    items = r_list.json()["data"]
    assert len(items) == 7
    assert any(a["id"] == "patna-bihar" for a in items)

    # 2. Boundary endpoint
    r_bnd = client.get("/api/study-areas/anantapur-arid-watershed/boundary")
    assert r_bnd.status_code == 200
    bnd_data = r_bnd.json()["data"]
    assert bnd_data["type"] == "Feature"
    assert bnd_data["geometry"]["type"] == "Polygon"

    # 3. Patna waterbodies vs other waterbodies separation
    r_patna_wb = client.get("/api/study-areas/patna-bihar/waterbodies")
    assert r_patna_wb.status_code == 200
    patna_data = r_patna_wb.json()["data"]
    assert patna_data["study_area_id"] == "patna-bihar"
    assert patna_data["waterbody_dataset_status"] == "imported"
    assert patna_data["total"] >= 15

    # Non-Patna area returns empty without fabricating data
    r_other_wb = client.get("/api/study-areas/thar-canal-command-area/waterbodies")
    assert r_other_wb.status_code == 200
    other_data = r_other_wb.json()["data"]
    assert other_data["total"] == 0
    assert len(other_data["items"]) == 0
    assert other_data["waterbody_dataset_status"] == "not_imported"

    # 4. Summary separation
    r_sum_patna = client.get("/api/study-areas/patna-bihar/summary")
    assert r_sum_patna.status_code == 200
    assert r_sum_patna.json()["data"]["total_waterbodies"] >= 15

    r_sum_other = client.get("/api/study-areas/vidarbha-basin/summary")
    assert r_sum_other.status_code == 200
    assert r_sum_other.json()["data"]["total_waterbodies"] == 0
    assert r_sum_other.json()["data"]["waterbody_dataset_status"] == "not_imported"

    # 5. Ground truth sites separation
    r_gt_patna = client.get("/api/study-areas/patna-bihar/ground-truth-sites")
    assert r_gt_patna.status_code == 200
    assert r_gt_patna.json()["data"]["total"] >= 15

    r_gt_other = client.get("/api/study-areas/kolar-sub-basin/ground-truth-sites")
    assert r_gt_other.status_code == 200
    assert r_gt_other.json()["data"]["total"] == 0

    # 6. Waterbodies query with study_area_id param
    r_wb_param = client.get("/api/v1/waterbodies?study_area_id=bundelkhand-recharge-zone")
    assert r_wb_param.status_code == 200
    assert r_wb_param.json()["data"]["total"] == 0


def test_invalid_study_area_ids_return_404():
    """Verify Section 11 requirement: Invalid study-area IDs return an appropriate 404 response."""
    invalid_id = "non-existent-watershed-xyz"

    # Detail
    r1 = client.get(f"/api/study-areas/{invalid_id}")
    assert r1.status_code == 404
    assert r1.json()["error"]["code"] == "STUDY_AREA_NOT_FOUND"

    # Boundary
    r2 = client.get(f"/api/study-areas/{invalid_id}/boundary")
    assert r2.status_code == 404
    assert r2.json()["error"]["code"] == "STUDY_AREA_NOT_FOUND"

    # Waterbodies
    r3 = client.get(f"/api/study-areas/{invalid_id}/waterbodies")
    assert r3.status_code == 404
    assert r3.json()["error"]["code"] == "STUDY_AREA_NOT_FOUND"

    # Summary
    r4 = client.get(f"/api/study-areas/{invalid_id}/summary")
    assert r4.status_code == 404
    assert r4.json()["error"]["code"] == "STUDY_AREA_NOT_FOUND"

    # Ground truth sites
    r5 = client.get(f"/api/study-areas/{invalid_id}/ground-truth-sites")
    assert r5.status_code == 404
    assert r5.json()["error"]["code"] == "STUDY_AREA_NOT_FOUND"


def test_all_seven_study_areas_geojson_validity():
    """Verify all 7 study areas have valid WGS84 GeoJSON geometries and compliant properties."""
    expected_ids = [
        "patna-bihar",
        "kolar-sub-basin",
        "raichur-tungabhadra-catchment",
        "anantapur-arid-watershed",
        "bundelkhand-recharge-zone",
        "vidarbha-basin",
        "thar-canal-command-area",
    ]

    r_list = client.get("/api/study-areas")
    assert r_list.status_code == 200
    items = r_list.json()["data"]
    item_ids = [a["id"] for a in items]

    for expected in expected_ids:
        assert expected in item_ids

    # Check each boundary GeoJSON
    for sa in items:
        sa_id = sa["id"]
        r_bnd = client.get(f"/api/study-areas/{sa_id}/boundary")
        assert r_bnd.status_code == 200
        feat = r_bnd.json()["data"]

        assert feat["type"] == "Feature"
        geom = feat["geometry"]
        assert geom["type"] == "Polygon"
        rings = geom["coordinates"]
        assert len(rings) >= 1

        # Check coordinate bounds inside India geographic envelope (approx lon 68-98, lat 8-38)
        for ring in rings:
            assert len(ring) >= 4  # Closed polygon has at least 4 coords
            assert ring[0] == ring[-1]  # First and last coordinates match (closed ring)
            for lon, lat in ring:
                assert 68.0 <= lon <= 98.0
                assert 8.0 <= lat <= 38.0


def test_study_area_search_by_aliases():
    """Verify searching study areas by aliases works for all 6 new study areas + Patna."""
    test_queries = [
        ("Kolar Watershed", "kolar-sub-basin"),
        ("Tungabhadra", "raichur-tungabhadra-catchment"),
        ("Ananthapuramu", "anantapur-arid-watershed"),
        ("Bundelkhand Recharge", "bundelkhand-recharge-zone"),
        ("Vidarbha Watershed", "vidarbha-basin"),
        ("Rajasthan Canal", "thar-canal-command-area"),
        ("Lower Ganga", "patna-bihar"),
    ]

    for query, expected_id in test_queries:
        r = client.get(f"/api/study-areas?q={query}")
        assert r.status_code == 200
        results = r.json()["data"]
        assert len(results) >= 1
        assert any(item["id"] == expected_id for item in results)


def test_authoritative_data_sources_registry():
    """Verify Section 2: Authoritative GIS data sources are documented and accessible."""
    resp = client.get("/api/study-areas/data-sources")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    sources = data["data"]
    assert len(sources) >= 5

    source_ids = [s["id"] for s in sources]
    assert "src-nwdp-surface-water" in source_ids
    assert "src-bhuvan-wbis" in source_ids
    assert "src-apsac-watershed" in source_ids
    assert "src-cgwb-aquifer" in source_ids

    # Validate schema of each source
    for s in sources:
        assert "publisher" in s
        assert "title" in s
        assert "url" in s
        assert "license" in s
        assert "observation_date" in s
        assert "spatial_resolution" in s
        assert "crs" in s
        assert "known_limitations" in s


def test_feature_categories_symbology():
    """Verify Section 3: Feature categories coverage across all 10 required types."""
    resp = client.get("/api/study-areas/categories")
    assert resp.status_code == 200
    cats = resp.json()["data"]
    assert len(cats) >= 10

    cat_keys = list(cats.keys()) if isinstance(cats, dict) else [c["id"] for c in cats]
    expected_categories = [
        "lake_pond", "village_pond_tank", "reservoir",
        "seasonal_waterbody", "farm_pond", "check_dam",
        "percolation_tank", "river_stream", "canal_distributary",
        "waterlogged_area"
    ]
    for exp in expected_categories:
        assert exp in cat_keys


def test_multi_region_inventory_loading_and_filtering():
    """Verify Section 3 & 4: Loading authoritative inventory across study areas and category filtering."""
    # 1. Load inventory for Thar Canal Command Area
    resp_thar = client.get("/api/study-areas/thar-canal-command-area/waterbodies?load_inventory=true")
    assert resp_thar.status_code == 200
    thar_data = resp_thar.json()["data"]
    assert thar_data["study_area_id"] == "thar-canal-command-area"
    assert thar_data["waterbody_dataset_status"] == "imported"
    assert thar_data["total"] >= 2
    assert len(thar_data["items"]) >= 2

    # Check waterlogged area is separated
    waterlogged = next((item for item in thar_data["items"] if item["feature_category"] == "waterlogged_area"), None)
    assert waterlogged is not None
    assert "seepage" in waterlogged["name"].lower() or "waterlogged" in waterlogged["name"].lower()
    assert waterlogged["area_hectares"] > 0

    # 2. Filter by category (e.g. check dams in Kolar)
    resp_kolar_cd = client.get("/api/study-areas/kolar-sub-basin/waterbodies?load_inventory=true&category=check_dam")
    assert resp_kolar_cd.status_code == 200
    kolar_cd_data = resp_kolar_cd.json()["data"]
    assert all(item["feature_category"] == "check_dam" for item in kolar_cd_data["items"])

    # 3. GeoJSON format export
    resp_gj = client.get("/api/study-areas/raichur-tungabhadra-catchment/waterbodies?load_inventory=true&format=geojson")
    assert resp_gj.status_code == 200
    gj = resp_gj.json()
    assert gj["type"] == "FeatureCollection"
    assert len(gj["features"]) >= 2
    assert gj["features"][0]["geometry"]["type"] in ["Polygon", "LineString", "Point"]


def test_spatial_analysis_endpoint():
    """Verify Section 5: Spatial analysis generation for study areas with multi-epoch water-spread."""
    # Anantapur Arid Watershed analysis
    resp = client.get("/api/study-areas/anantapur-arid-watershed/analysis")
    assert resp.status_code == 200
    data = resp.json()["data"]

    # 1. Inventory metrics
    inv = data["inventory_metrics"]
    assert inv["total_waterbody_records"] >= 2
    assert inv["total_mapped_area_ha"] > 0
    assert "village_pond_tank" in inv["category_distribution"]

    # 2. Historical water spread
    hws = data["historical_water_spread"]
    assert len(hws["epochs"]) >= 2
    assert "seasonal_delta_ha" in hws
    assert "seasonal_expansion_pct" in hws

    # 3. Conservation analysis
    cons = data["conservation_analysis"]
    assert "check_dams" in cons
    assert "farm_ponds" in cons

    # 4. Environmental change flags
    env = data["environmental_change_analysis"]
    assert len(env["flags"]) >= 1


def test_gis_layers_catalog_and_exports():
    """Verify Section 7 & 10: Layer catalog retrieval and CSV/GeoJSON exports."""
    # 1. Layer catalog
    resp_layers = client.get("/api/study-areas/vidarbha-basin/layers")
    assert resp_layers.status_code == 200
    layers = resp_layers.json()["data"]["layers"]
    layer_ids = [l["id"] for l in layers]
    assert "boundary" in layer_ids
    assert "waterbodies" in layer_ids
    assert "rivers" in layer_ids
    assert "conservation" in layer_ids

    # 2. CSV Export
    resp_csv = client.get("/api/study-areas/bundelkhand-recharge-zone/export?format=csv")
    assert resp_csv.status_code == 200
    assert "text/csv" in resp_csv.headers["content-type"]
    assert "Internal_ID,Source_ID,Name,Category" in resp_csv.text

    # 3. GeoJSON Export
    resp_export_gj = client.get("/api/study-areas/bundelkhand-recharge-zone/export?format=geojson")
    assert resp_export_gj.status_code == 200
    export_gj = resp_export_gj.json()
    assert export_gj["type"] == "FeatureCollection"
    assert len(export_gj["features"]) >= 1


def test_pipeline_ingest_endpoint():
    """Verify Section 2: Reusable ingestion pipeline for GeoJSON and CSV coordinates."""
    # Test GeoJSON ingestion
    geojson_payload = {
        "format_type": "geojson",
        "payload_content": json.dumps({
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [77.55, 22.95]
                    },
                    "properties": {
                        "name": "Pipeline Ingested Percolation Tank",
                        "category": "percolation_tank",
                        "area_ha": 2.5
                    }
                }
            ]
        }),
        "source_citation": "Bhopal WRD Field Survey Batch 2026"
    }
    resp = client.post("/api/study-areas/kolar-sub-basin/pipeline/ingest", json=geojson_payload)
    assert resp.status_code == 200
    result = resp.json()["data"]
    assert result["imported_count"] == 1
    assert "kolar-sub-basin" in result["study_area_id"]




