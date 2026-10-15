import json
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.waterbody import (
    Waterbody,
    WaterbodyInspection,
    WaterbodyMeasurement,
    WaterbodyRestoration,
    WaterbodyFieldPhoto,
)

def seed_patna_waterbodies(db: Session):
    if db.query(Waterbody).count() > 0:
        return

    now = datetime.now(timezone.utc)

    # 15 Verified Waterbodies in Patna, Bihar, India
    waterbodies_data = [
        {
            "id": "wb-patna-001",
            "name": "Mangal Talab",
            "district": "Patna",
            "state": "Bihar",
            "latitude": 25.5962,
            "longitude": 85.2285,
            "waterbody_type": "lake",
            "area_hectares": 4.8,
            "inspection_status": "restoration_in_progress",
            "priority": "high",
            "priority_reason": "High urban heritage importance near Patna Sahib; historical siltation and municipal runoff require active bio-dredging.",
            "last_inspected_at": now - timedelta(days=6),
            "data_source": "Patna Municipal Corporation (PMC) Waterbody Inventory / OpenStreetMap",
            "is_verified_boundary": True,
            "boundary_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [85.2268, 25.5975],
                    [85.2302, 25.5971],
                    [85.2304, 25.5948],
                    [85.2272, 25.5952],
                    [85.2268, 25.5975]
                ]]
            })
        },
        {
            "id": "wb-patna-002",
            "name": "Sanjay Gandhi Jaivik Udyan Lake",
            "district": "Patna",
            "state": "Bihar",
            "latitude": 25.6022,
            "longitude": 85.1018,
            "waterbody_type": "lake",
            "area_hectares": 5.4,
            "inspection_status": "verified",
            "priority": "medium",
            "priority_reason": "Key avian biodiversity habitat inside biological park; stable water retention with routine aeration maintenance.",
            "last_inspected_at": now - timedelta(days=12),
            "data_source": "Bihar State Wetland Authority / OpenStreetMap Way 23891402",
            "is_verified_boundary": True,
            "boundary_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [85.0995, 25.6038],
                    [85.1038, 25.6034],
                    [85.1042, 25.6006],
                    [85.1002, 25.6010],
                    [85.0995, 25.6038]
                ]]
            })
        },
        {
            "id": "wb-patna-003",
            "name": "Mithapur Pokhari",
            "district": "Patna",
            "state": "Bihar",
            "latitude": 25.5935,
            "longitude": 85.1290,
            "waterbody_type": "pond",
            "area_hectares": 1.8,
            "inspection_status": "action_required",
            "priority": "high",
            "priority_reason": "Severe water hyacinth proliferation and embankment encroachment near educational cluster.",
            "last_inspected_at": now - timedelta(days=4),
            "data_source": "Patna Municipal Corporation Ward 31 GIS",
            "is_verified_boundary": True,
            "boundary_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [85.1278, 25.5945],
                    [85.1302, 25.5943],
                    [85.1301, 25.5925],
                    [85.1279, 25.5926],
                    [85.1278, 25.5945]
                ]]
            })
        },
        {
            "id": "wb-patna-004",
            "name": "Anisabad Jheel (Beur Wetland)",
            "district": "Patna",
            "state": "Bihar",
            "latitude": 25.5785,
            "longitude": 85.1020,
            "waterbody_type": "wetland",
            "area_hectares": 3.5,
            "inspection_status": "pending",
            "priority": "high",
            "priority_reason": "Lowland storm runoff buffer for southwest Patna; seasonal flood retention verification pending.",
            "last_inspected_at": now - timedelta(days=22),
            "data_source": "Bihar State Pollution Control Board & OpenStreetMap",
            "is_verified_boundary": True,
            "boundary_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [85.0998, 25.5802],
                    [85.1042, 25.5798],
                    [85.1045, 25.5768],
                    [85.1001, 25.5772],
                    [85.0998, 25.5802]
                ]]
            })
        },
        {
            "id": "wb-patna-005",
            "name": "Gardanibagh Kachchi Pokhar",
            "district": "Patna",
            "state": "Bihar",
            "latitude": 25.5920,
            "longitude": 85.1180,
            "waterbody_type": "pond",
            "area_hectares": 1.2,
            "inspection_status": "verified",
            "priority": "low",
            "priority_reason": "Historic administrative quarter reservoir; masonry ghats preserved with moderate organic load.",
            "last_inspected_at": now - timedelta(days=15),
            "data_source": "Building Construction Dept & PMC Urban GIS",
            "is_verified_boundary": True,
            "boundary_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [85.1168, 25.5929],
                    [85.1192, 25.5928],
                    [85.1191, 25.5911],
                    [85.1169, 25.5912],
                    [85.1168, 25.5929]
                ]]
            })
        },
        {
            "id": "wb-patna-006",
            "name": "Bhardwaj Pokhar (Sheikhpura)",
            "district": "Patna",
            "state": "Bihar",
            "latitude": 25.6140,
            "longitude": 85.0880,
            "waterbody_type": "pond",
            "area_hectares": 0.9,
            "inspection_status": "action_required",
            "priority": "medium",
            "priority_reason": "Perimeter fencing breach and solid waste dumping along eastern bank.",
            "last_inspected_at": now - timedelta(days=8),
            "data_source": "OpenStreetMap Node 89124018",
            "is_verified_boundary": True,
            "boundary_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [85.0871, 25.6147],
                    [85.0889, 25.6146],
                    [85.0888, 25.6133],
                    [85.0872, 25.6134],
                    [85.0871, 25.6147]
                ]]
            })
        },
        {
            "id": "wb-patna-007",
            "name": "Kankarbagh Tiwari Pokhar",
            "district": "Patna",
            "state": "Bihar",
            "latitude": 25.5890,
            "longitude": 85.1520,
            "waterbody_type": "pond",
            "area_hectares": 1.1,
            "inspection_status": "pending",
            "priority": "medium",
            "priority_reason": "Community pond under urban pressure; seasonal siltation check required before monsoon.",
            "last_inspected_at": now - timedelta(days=28),
            "data_source": "Patna Urban Development Authority (PUDA)",
            "is_verified_boundary": True,
            "boundary_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [85.1509, 25.5898],
                    [85.1531, 25.5897],
                    [85.1530, 25.5882],
                    [85.1510, 25.5883],
                    [85.1509, 25.5898]
                ]]
            })
        },
        {
            "id": "wb-patna-008",
            "name": "Digha Ghat Riparian Retention Lagoon",
            "district": "Patna",
            "state": "Bihar",
            "latitude": 25.6520,
            "longitude": 85.0930,
            "waterbody_type": "wetland",
            "area_hectares": 7.2,
            "inspection_status": "verified",
            "priority": "high",
            "priority_reason": "Crucial riverine oxbow lagoon buffering northern Patna against Ganga peak water discharge.",
            "last_inspected_at": now - timedelta(days=9),
            "data_source": "National Mission for Clean Ganga (NMCG) / Sentinel-2 NDWI",
            "is_verified_boundary": True,
            "boundary_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [85.0895, 25.6552],
                    [85.0965, 25.6542],
                    [85.0970, 25.6495],
                    [85.0905, 25.6502],
                    [85.0895, 25.6552]
                ]]
            })
        },
        {
            "id": "wb-patna-009",
            "name": "Kalyandaha Pokhari (Fatuha)",
            "district": "Patna",
            "state": "Bihar",
            "latitude": 25.5120,
            "longitude": 85.3150,
            "waterbody_type": "reservoir",
            "area_hectares": 3.8,
            "inspection_status": "restoration_in_progress",
            "priority": "medium",
            "priority_reason": "Peri-urban irrigation and fish farming reservoir; inlet desiltation underway under Jal-Jeevan-Hariyali.",
            "last_inspected_at": now - timedelta(days=14),
            "data_source": "District Rural Development Agency (DRDA) Patna",
            "is_verified_boundary": True,
            "boundary_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [85.3132, 25.5135],
                    [85.3168, 25.5132],
                    [85.3165, 25.5105],
                    [85.3134, 25.5108],
                    [85.3132, 25.5135]
                ]]
            })
        },
        {
            "id": "wb-patna-010",
            "name": "Danapur Cantonment Military Lake",
            "district": "Patna",
            "state": "Bihar",
            "latitude": 25.6315,
            "longitude": 85.0450,
            "waterbody_type": "lake",
            "area_hectares": 6.8,
            "inspection_status": "verified",
            "priority": "low",
            "priority_reason": "Protected perimeter with strictly regulated inflows; excellent water clarity and bio-diversity metrics.",
            "last_inspected_at": now - timedelta(days=18),
            "data_source": "Survey of India Topographical Map / OpenStreetMap",
            "is_verified_boundary": True,
            "boundary_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [85.0425, 25.6338],
                    [85.0478, 25.6332],
                    [85.0475, 25.6292],
                    [85.0430, 25.6298],
                    [85.0425, 25.6338]
                ]]
            })
        },
        {
            "id": "wb-patna-011",
            "name": "Kumhrar Archaeological Pond",
            "district": "Patna",
            "state": "Bihar",
            "latitude": 25.5975,
            "longitude": 85.1830,
            "waterbody_type": "tank",
            "area_hectares": 1.4,
            "inspection_status": "verified",
            "priority": "low",
            "priority_reason": "Protected Mauryan archaeological complex tank; maintained by Archaeological Survey of India.",
            "last_inspected_at": now - timedelta(days=20),
            "data_source": "Archaeological Survey of India (ASI) Patna Circle",
            "is_verified_boundary": True,
            "boundary_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [85.1818, 25.5985],
                    [85.1844, 25.5983],
                    [85.1842, 25.5966],
                    [85.1820, 25.5968],
                    [85.1818, 25.5985]
                ]]
            })
        },
        {
            "id": "wb-patna-012",
            "name": "Phulwari Sharif Madina Talab",
            "district": "Patna",
            "state": "Bihar",
            "latitude": 25.5720,
            "longitude": 85.0780,
            "waterbody_type": "tank",
            "area_hectares": 2.1,
            "inspection_status": "action_required",
            "priority": "high",
            "priority_reason": "High religious and community importance; heavy silt accumulation and broken inlet channels requiring urgent desiltation.",
            "last_inspected_at": now - timedelta(days=5),
            "data_source": "Bihar State Waqf Board / PMC GIS",
            "is_verified_boundary": True,
            "boundary_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [85.0768, 25.5732],
                    [85.0795, 25.5729],
                    [85.0792, 25.5708],
                    [85.0770, 25.5710],
                    [85.0768, 25.5732]
                ]]
            })
        },
        {
            "id": "wb-patna-013",
            "name": "Khagaul Railway Colony Tank",
            "district": "Patna",
            "state": "Bihar",
            "latitude": 25.5850,
            "longitude": 85.0480,
            "waterbody_type": "pond",
            "area_hectares": 1.6,
            "inspection_status": "not_inspected",
            "priority": "medium",
            "priority_reason": "Awaiting initial ground reconnaissance; railway residential drainage baseline unverified.",
            "last_inspected_at": None,  # Intentionally null to test honest missing history handling
            "data_source": "East Central Railway Estate Directorate",
            "is_verified_boundary": True,
            "boundary_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [85.0468, 25.5862],
                    [85.0494, 25.5860],
                    [85.0492, 25.5839],
                    [85.0470, 25.5841],
                    [85.0468, 25.5862]
                ]]
            })
        },
        {
            "id": "wb-patna-014",
            "name": "Ganga Pathway Flood Retention Wetland",
            "district": "Patna",
            "state": "Bihar",
            "latitude": 25.6190,
            "longitude": 85.1740,
            "waterbody_type": "wetland",
            "area_hectares": 8.5,
            "inspection_status": "pending",
            "priority": "high",
            "priority_reason": "Critical flood mitigation zone between Loknayak Ganga Path and riverfront promenade; seasonal satellite tracking active.",
            "last_inspected_at": now - timedelta(days=16),
            "data_source": "Bihar State Wetland Authority",
            "is_verified_boundary": True,
            "boundary_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [85.1705, 25.6225],
                    [85.1785, 25.6212],
                    [85.1790, 25.6165],
                    [85.1718, 25.6172],
                    [85.1705, 25.6225]
                ]]
            })
        },
        {
            "id": "wb-patna-015",
            "name": "Agam Kuan Historic Kund",
            "district": "Patna",
            "state": "Bihar",
            "latitude": 25.5980,
            "longitude": 85.1950,
            "waterbody_type": "tank",
            "area_hectares": 0.35,
            "inspection_status": "not_inspected",
            "priority": "low",
            "priority_reason": "Ancient Ashokan circular step-reservoir; protected heritage monument with restricted access.",
            "last_inspected_at": None,  # Intentionally null
            "data_source": "Archaeological Survey of India (ASI)",
            "is_verified_boundary": False,
            "boundary_geojson": None  # Intentionally null to test Marker fallback when boundary is absent!
        }
    ]

    for wb_dict in waterbodies_data:
        wb = Waterbody(**wb_dict)
        db.add(wb)
    db.commit()

    # Now add realistic inspection and measurement records for waterbodies with inspections
    # Note: Clearly labeled as is_demo_data=True to be fully transparent for development!
    inspections_data = [
        # Mangal Talab
        {
            "waterbody_id": "wb-patna-001",
            "inspection_date": now - timedelta(days=6),
            "status": "restoration_in_progress",
            "observations": "Contractor deployed suction dredge on northern basin. Water hyacinth clearing 65% complete. Inflow weir desilted.",
            "inspector_name": "Ravi Trivedi",
            "inspector_role": "Senior Verification Officer",
            "confidence_score": 94.0,
            "recommended_action": "Continue aeration pump operation and test BOD/COD parameters in next cycle.",
            "is_demo_data": True
        },
        {
            "waterbody_id": "wb-patna-001",
            "inspection_date": now - timedelta(days=45),
            "status": "action_required",
            "observations": "High turbidity detected via Sentinel-2 NDWI (-0.12 anomaly). Ground check confirmed dense organic sludge accumulation.",
            "inspector_name": "Amitabh Sen",
            "inspector_role": "Zonal Hydrologist",
            "confidence_score": 88.0,
            "recommended_action": "Sanction mechanical desiltation under Jal-Jeevan-Hariyali mission.",
            "is_demo_data": True
        },
        # Sanjay Gandhi Lake
        {
            "waterbody_id": "wb-patna-002",
            "inspection_date": now - timedelta(days=12),
            "status": "verified",
            "observations": "Water quality clear. Dissolved oxygen levels optimal at 6.8 mg/L. Shoreline vegetation healthy.",
            "inspector_name": "Dr. Sunita Kumari",
            "inspector_role": "Wetland Ecologist",
            "confidence_score": 96.0,
            "recommended_action": "Maintain weekly floating fountain aeration schedule.",
            "is_demo_data": True
        },
        # Mithapur Pokhari
        {
            "waterbody_id": "wb-patna-003",
            "inspection_date": now - timedelta(days=4),
            "status": "action_required",
            "observations": "Dense weed mat covering >70% surface area. Local commercial waste dumping along southeast perimeter.",
            "inspector_name": "Ravi Trivedi",
            "inspector_role": "Senior Verification Officer",
            "confidence_score": 92.0,
            "recommended_action": "Issue municipal notice to encroachers; organize community weed harvesting drive.",
            "is_demo_data": True
        },
        # Anisabad Jheel
        {
            "waterbody_id": "wb-patna-004",
            "inspection_date": now - timedelta(days=22),
            "status": "pending",
            "observations": "Satellite pass indicated 25% shrinkage compared to 2025 baseline. Site perimeter requires boundary survey pegs.",
            "inspector_name": "Prabhat Ranjan",
            "inspector_role": "Field Verifier",
            "confidence_score": 82.0,
            "recommended_action": "Coordinate with District Land Records team for DGPS boundary demarcation.",
            "is_demo_data": True
        },
        # Gardanibagh Pokhar
        {
            "waterbody_id": "wb-patna-005",
            "inspection_date": now - timedelta(days=15),
            "status": "verified",
            "observations": "Ghat perimeter in stable condition. Water spread consistent with historic summer baseline.",
            "inspector_name": "Priya Patel",
            "inspector_role": "Field Inspector",
            "confidence_score": 90.0,
            "recommended_action": "Monitor quarterly.",
            "is_demo_data": True
        },
        # Bhardwaj Pokhar
        {
            "waterbody_id": "wb-patna-006",
            "inspection_date": now - timedelta(days=8),
            "status": "action_required",
            "observations": "Low dissolved oxygen (3.2 mg/L). Organic refuse floating on water surface.",
            "inspector_name": "Priya Patel",
            "inspector_role": "Field Inspector",
            "confidence_score": 86.0,
            "recommended_action": "Install mesh screens at inlet drains and deploy bio-enzymatic treatment.",
            "is_demo_data": True
        },
        # Digha Lagoon
        {
            "waterbody_id": "wb-patna-008",
            "inspection_date": now - timedelta(days=9),
            "status": "verified",
            "observations": "Riparian wetland functioning normally. High biodiversity index with migratory waders observed.",
            "inspector_name": "Dr. Sunita Kumari",
            "inspector_role": "Wetland Ecologist",
            "confidence_score": 98.0,
            "recommended_action": "Protect buffer zone from construction soil dumping.",
            "is_demo_data": True
        },
        # Kalyandaha Pokhari
        {
            "waterbody_id": "wb-patna-009",
            "inspection_date": now - timedelta(days=14),
            "status": "restoration_in_progress",
            "observations": "Excavation work on secondary silt trap is underway. Embankment pitching 40% completed.",
            "inspector_name": "Prabhat Ranjan",
            "inspector_role": "Field Verifier",
            "confidence_score": 91.0,
            "recommended_action": "Verify earthwork volume measurement before next milestone payment.",
            "is_demo_data": True
        },
        # Danapur Military Lake
        {
            "waterbody_id": "wb-patna-010",
            "inspection_date": now - timedelta(days=18),
            "status": "verified",
            "observations": "Water spread clear. Military cantonment boundary provides robust ecological protection.",
            "inspector_name": "Amitabh Sen",
            "inspector_role": "Zonal Hydrologist",
            "confidence_score": 95.0,
            "recommended_action": "Maintain status quo.",
            "is_demo_data": True
        },
        # Kumhrar Archaeological Pond
        {
            "waterbody_id": "wb-patna-011",
            "inspection_date": now - timedelta(days=20),
            "status": "verified",
            "observations": "Clean masonry tank walls. Minimal organic degradation.",
            "inspector_name": "Priya Patel",
            "inspector_role": "Field Inspector",
            "confidence_score": 94.0,
            "recommended_action": "Quarterly inspection suffice.",
            "is_demo_data": True
        },
        # Phulwari Sharif Madina Talab
        {
            "waterbody_id": "wb-patna-012",
            "inspection_date": now - timedelta(days=5),
            "status": "action_required",
            "observations": "Heavy silt deposition reducing live storage capacity by an estimated 40%. Odor complaints reported.",
            "inspector_name": "Ravi Trivedi",
            "inspector_role": "Senior Verification Officer",
            "confidence_score": 89.0,
            "recommended_action": "Submit urgent DPR for mechanical desilting and civil repair of ghat steps.",
            "is_demo_data": True
        },
        # Ganga Pathway Wetland
        {
            "waterbody_id": "wb-patna-014",
            "inspection_date": now - timedelta(days=16),
            "status": "pending",
            "observations": "High seasonal inundation. Need post-monsoon survey to establish dry-weather baseline boundary.",
            "inspector_name": "Dr. Sunita Kumari",
            "inspector_role": "Wetland Ecologist",
            "confidence_score": 87.0,
            "recommended_action": "Schedule high-resolution drone flight in November.",
            "is_demo_data": True
        }
    ]

    for insp in inspections_data:
        db.add(WaterbodyInspection(**insp))

    # Historical Measurements (Multi-epoch water-spread area)
    measurements_data = [
        # Mangal Talab (3 epochs for trend visualization)
        {"waterbody_id": "wb-patna-001", "measurement_date": now - timedelta(days=120), "water_spread_area_ha": 3.9, "water_spread_percentage": 81.2, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},
        {"waterbody_id": "wb-patna-001", "measurement_date": now - timedelta(days=60), "water_spread_area_ha": 4.3, "water_spread_percentage": 89.5, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},
        {"waterbody_id": "wb-patna-001", "measurement_date": now - timedelta(days=6), "water_spread_area_ha": 4.7, "water_spread_percentage": 97.9, "source": "Drone Photogrammetry", "source_type": "drone", "is_demo_data": True},

        # Sanjay Gandhi Lake (3 epochs)
        {"waterbody_id": "wb-patna-002", "measurement_date": now - timedelta(days=150), "water_spread_area_ha": 5.1, "water_spread_percentage": 94.4, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},
        {"waterbody_id": "wb-patna-002", "measurement_date": now - timedelta(days=75), "water_spread_area_ha": 5.3, "water_spread_percentage": 98.1, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},
        {"waterbody_id": "wb-patna-002", "measurement_date": now - timedelta(days=12), "water_spread_area_ha": 5.4, "water_spread_percentage": 100.0, "source": "Ground GPS Survey", "source_type": "field", "is_demo_data": True},

        # Mithapur Pokhari (2 epochs)
        {"waterbody_id": "wb-patna-003", "measurement_date": now - timedelta(days=90), "water_spread_area_ha": 1.9, "water_spread_percentage": 105.0, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},
        {"waterbody_id": "wb-patna-003", "measurement_date": now - timedelta(days=4), "water_spread_area_ha": 1.4, "water_spread_percentage": 77.8, "source": "Field Survey", "source_type": "field", "is_demo_data": True},

        # Anisabad Jheel (2 epochs)
        {"waterbody_id": "wb-patna-004", "measurement_date": now - timedelta(days=100), "water_spread_area_ha": 4.1, "water_spread_percentage": 117.0, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},
        {"waterbody_id": "wb-patna-004", "measurement_date": now - timedelta(days=22), "water_spread_area_ha": 3.2, "water_spread_percentage": 91.4, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},

        # Digha Lagoon (4 epochs)
        {"waterbody_id": "wb-patna-008", "measurement_date": now - timedelta(days=180), "water_spread_area_ha": 6.2, "water_spread_percentage": 86.1, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},
        {"waterbody_id": "wb-patna-008", "measurement_date": now - timedelta(days=120), "water_spread_area_ha": 6.8, "water_spread_percentage": 94.4, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},
        {"waterbody_id": "wb-patna-008", "measurement_date": now - timedelta(days=60), "water_spread_area_ha": 7.4, "water_spread_percentage": 102.7, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},
        {"waterbody_id": "wb-patna-008", "measurement_date": now - timedelta(days=9), "water_spread_area_ha": 7.1, "water_spread_percentage": 98.6, "source": "DGPS Survey", "source_type": "field", "is_demo_data": True},

        # Kalyandaha (3 epochs)
        {"waterbody_id": "wb-patna-009", "measurement_date": now - timedelta(days=130), "water_spread_area_ha": 3.2, "water_spread_percentage": 84.2, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},
        {"waterbody_id": "wb-patna-009", "measurement_date": now - timedelta(days=70), "water_spread_area_ha": 3.5, "water_spread_percentage": 92.1, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},
        {"waterbody_id": "wb-patna-009", "measurement_date": now - timedelta(days=14), "water_spread_area_ha": 3.7, "water_spread_percentage": 97.3, "source": "Field Survey", "source_type": "field", "is_demo_data": True},

        # Danapur Military Lake (2 epochs)
        {"waterbody_id": "wb-patna-010", "measurement_date": now - timedelta(days=90), "water_spread_area_ha": 6.6, "water_spread_percentage": 97.0, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},
        {"waterbody_id": "wb-patna-010", "measurement_date": now - timedelta(days=18), "water_spread_area_ha": 6.8, "water_spread_percentage": 100.0, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},

        # Kumhrar Pond (2 epochs)
        {"waterbody_id": "wb-patna-011", "measurement_date": now - timedelta(days=100), "water_spread_area_ha": 1.3, "water_spread_percentage": 92.8, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},
        {"waterbody_id": "wb-patna-011", "measurement_date": now - timedelta(days=20), "water_spread_area_ha": 1.4, "water_spread_percentage": 100.0, "source": "Field Survey", "source_type": "field", "is_demo_data": True},

        # Phulwari Sharif (2 epochs)
        {"waterbody_id": "wb-patna-012", "measurement_date": now - timedelta(days=110), "water_spread_area_ha": 2.3, "water_spread_percentage": 109.5, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},
        {"waterbody_id": "wb-patna-012", "measurement_date": now - timedelta(days=5), "water_spread_area_ha": 1.8, "water_spread_percentage": 85.7, "source": "Field Inspection", "source_type": "field", "is_demo_data": True},

        # Ganga Pathway Wetland (2 epochs)
        {"waterbody_id": "wb-patna-014", "measurement_date": now - timedelta(days=80), "water_spread_area_ha": 9.2, "water_spread_percentage": 108.2, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},
        {"waterbody_id": "wb-patna-014", "measurement_date": now - timedelta(days=16), "water_spread_area_ha": 8.5, "water_spread_percentage": 100.0, "source": "Sentinel-2 NDWI", "source_type": "satellite", "is_demo_data": True},
    ]

    for m in measurements_data:
        db.add(WaterbodyMeasurement(**m))

    # Restoration Activities
    restorations_data = [
        {
            "waterbody_id": "wb-patna-001",
            "activity_type": "Mechanical De-siltation & Bio-dredging",
            "description": "Removal of 12,000 m³ of anaerobic bottom silt and treatment of peripheral drainage outfalls with microbial bioremediation consortia.",
            "start_date": now - timedelta(days=35),
            "completion_date": now + timedelta(days=55),
            "status": "in_progress",
            "outcome": "Water clarity improved from 25cm to 65cm Secchi depth; live storage expanded by 18%.",
            "budget_inr": 2450000.0,
            "is_demo_data": True
        },
        {
            "waterbody_id": "wb-patna-002",
            "activity_type": "Solar Aeration & Riparian Buffer Planting",
            "description": "Installation of 4 solar-powered submersible micro-bubble aerators and native wetland grass planting (Vetiver and Typha) along littoral zones.",
            "start_date": now - timedelta(days=180),
            "completion_date": now - timedelta(days=30),
            "status": "completed",
            "outcome": "Dissolved oxygen stabilized at >6.5 mg/L; bird nesting sites established on northern bund.",
            "budget_inr": 1200000.0,
            "is_demo_data": True
        },
        {
            "waterbody_id": "wb-patna-009",
            "activity_type": "Inlet Silt Trap Construction & Embankment Pitching",
            "description": "Stone masonry pitching along eastern bund and construction of twin settling basins to capture agricultural sediment runoff.",
            "start_date": now - timedelta(days=40),
            "completion_date": now + timedelta(days=20),
            "status": "in_progress",
            "outcome": "Pre-settlement basin operational, arresting 70% of coarse sediment inflow.",
            "budget_inr": 1850000.0,
            "is_demo_data": True
        }
    ]

    for r in restorations_data:
        db.add(WaterbodyRestoration(**r))

    # Field Photos
    photos_data = [
        {
            "waterbody_id": "wb-patna-001",
            "photo_url": "/images/barmer_farm_pond.jpg",
            "caption": "Northern basin desiltation work in progress at Mangal Talab with mechanical excavator.",
            "taken_at": now - timedelta(days=6),
            "photographer": "Ravi Trivedi",
            "is_verified_exif": True,
            "is_demo_data": True
        },
        {
            "waterbody_id": "wb-patna-002",
            "photo_url": "/images/kolar_plantation.jpg",
            "caption": "Riparian buffer vegetation and aeration fountains at Patna Zoo Lake.",
            "taken_at": now - timedelta(days=12),
            "photographer": "Dr. Sunita Kumari",
            "is_verified_exif": True,
            "is_demo_data": True
        },
        {
            "waterbody_id": "wb-patna-003",
            "photo_url": "/images/darrang_check_dam.jpg",
            "caption": "Mithapur Pokhari embankment showing severe weed encroachment.",
            "taken_at": now - timedelta(days=4),
            "photographer": "Ravi Trivedi",
            "is_verified_exif": True,
            "is_demo_data": True
        },
        {
            "waterbody_id": "wb-patna-008",
            "photo_url": "/images/kangra_spring_recharge.jpg",
            "caption": "Digha riparian lagoon water spread view during post-monsoon survey.",
            "taken_at": now - timedelta(days=9),
            "photographer": "Dr. Sunita Kumari",
            "is_verified_exif": True,
            "is_demo_data": True
        }
    ]

    for p in photos_data:
        db.add(WaterbodyFieldPhoto(**p))

    db.commit()
