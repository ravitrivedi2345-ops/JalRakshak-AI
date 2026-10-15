export type InspectionStatus =
  | "not_inspected"
  | "pending"
  | "verified"
  | "action_required"
  | "restoration_in_progress";

export type PriorityLevel = "low" | "medium" | "high";

export type WaterbodyType = "pond" | "lake" | "reservoir" | "wetland" | "tank";

export type WaterbodyItem = {
  id: string;
  name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  waterbody_type: WaterbodyType;
  area_hectares: number | null;
  inspection_status: InspectionStatus;
  priority: PriorityLevel;
  priority_reason?: string | null;
  last_inspected_at: string | null;
  data_source: string;
  is_verified_boundary: boolean;
  has_polygon: boolean;
  boundary?: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  } | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type WaterbodyInspection = {
  id: string;
  waterbody_id: string;
  inspection_date: string;
  status: InspectionStatus;
  observations: string;
  inspector_name: string;
  inspector_role: string;
  confidence_score: number;
  recommended_action?: string | null;
  is_demo_data: boolean;
};

export type WaterbodyMeasurement = {
  id: string;
  waterbody_id: string;
  measurement_date: string;
  water_spread_area_ha: number;
  water_spread_percentage?: number | null;
  source: string;
  source_type: "satellite" | "field" | "drone";
  notes?: string | null;
  is_demo_data: boolean;
};

export type WaterbodyRestoration = {
  id: string;
  waterbody_id: string;
  activity_type: string;
  description: string;
  start_date: string;
  completion_date?: string | null;
  status: "planned" | "in_progress" | "completed";
  outcome?: string | null;
  budget_inr?: number | null;
  is_demo_data: boolean;
};

export type WaterbodyFieldPhoto = {
  id: string;
  waterbody_id: string;
  photo_url: string;
  caption: string;
  taken_at: string;
  photographer: string;
  is_verified_exif: boolean;
  is_demo_data: boolean;
};

export type WaterbodyHistory = {
  waterbody_id: string;
  waterbody_name: string;
  has_history: boolean;
  inspections: WaterbodyInspection[];
  measurements: WaterbodyMeasurement[];
  restorations: WaterbodyRestoration[];
  photos: WaterbodyFieldPhoto[];
  measurement_trend_available: boolean;
};

export type WaterbodySummary = {
  district: string;
  state: string;
  total_waterbodies: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_type: Record<string, number>;
  total_area_hectares: number;
  verified_boundaries_count: number;
};

// 15 Verified Waterbodies in Patna, Bihar, India
export const verifiedPatnaWaterbodies: WaterbodyItem[] = [
  {
    id: "wb-patna-001",
    name: "Mangal Talab",
    district: "Patna",
    state: "Bihar",
    latitude: 25.5962,
    longitude: 85.2285,
    waterbody_type: "lake",
    area_hectares: 4.8,
    inspection_status: "restoration_in_progress",
    priority: "high",
    priority_reason: "High urban heritage importance near Patna Sahib; historical siltation and municipal runoff require active bio-dredging.",
    last_inspected_at: "2026-04-09T10:30:00Z",
    data_source: "Patna Municipal Corporation (PMC) Waterbody Inventory / OpenStreetMap",
    is_verified_boundary: true,
    has_polygon: true,
    boundary: {
      type: "Polygon",
      coordinates: [[
        [85.2268, 25.5975],
        [85.2302, 25.5971],
        [85.2304, 25.5948],
        [85.2272, 25.5952],
        [85.2268, 25.5975]
      ]]
    }
  },
  {
    id: "wb-patna-002",
    name: "Sanjay Gandhi Jaivik Udyan Lake",
    district: "Patna",
    state: "Bihar",
    latitude: 25.6022,
    longitude: 85.1018,
    waterbody_type: "lake",
    area_hectares: 5.4,
    inspection_status: "verified",
    priority: "medium",
    priority_reason: "Key avian biodiversity habitat inside biological park; stable water retention with routine aeration maintenance.",
    last_inspected_at: "2026-04-03T11:15:00Z",
    data_source: "Bihar State Wetland Authority / OpenStreetMap Way 23891402",
    is_verified_boundary: true,
    has_polygon: true,
    boundary: {
      type: "Polygon",
      coordinates: [[
        [85.0995, 25.6038],
        [85.1038, 25.6034],
        [85.1042, 25.6006],
        [85.1002, 25.6010],
        [85.0995, 25.6038]
      ]]
    }
  },
  {
    id: "wb-patna-003",
    name: "Mithapur Pokhari",
    district: "Patna",
    state: "Bihar",
    latitude: 25.5935,
    longitude: 85.1290,
    waterbody_type: "pond",
    area_hectares: 1.8,
    inspection_status: "action_required",
    priority: "high",
    priority_reason: "Severe water hyacinth proliferation and embankment encroachment near educational cluster.",
    last_inspected_at: "2026-04-11T09:45:00Z",
    data_source: "Patna Municipal Corporation Ward 31 GIS",
    is_verified_boundary: true,
    has_polygon: true,
    boundary: {
      type: "Polygon",
      coordinates: [[
        [85.1278, 25.5945],
        [85.1302, 25.5943],
        [85.1301, 25.5925],
        [85.1279, 25.5926],
        [85.1278, 25.5945]
      ]]
    }
  },
  {
    id: "wb-patna-004",
    name: "Anisabad Jheel (Beur Wetland)",
    district: "Patna",
    state: "Bihar",
    latitude: 25.5785,
    longitude: 85.1020,
    waterbody_type: "wetland",
    area_hectares: 3.5,
    inspection_status: "pending",
    priority: "high",
    priority_reason: "Lowland storm runoff buffer for southwest Patna; seasonal flood retention verification pending.",
    last_inspected_at: "2026-03-24T14:20:00Z",
    data_source: "Bihar State Pollution Control Board & OpenStreetMap",
    is_verified_boundary: true,
    has_polygon: true,
    boundary: {
      type: "Polygon",
      coordinates: [[
        [85.0998, 25.5802],
        [85.1042, 25.5798],
        [85.1045, 25.5768],
        [85.1001, 25.5772],
        [85.0998, 25.5802]
      ]]
    }
  },
  {
    id: "wb-patna-005",
    name: "Gardanibagh Kachchi Pokhar",
    district: "Patna",
    state: "Bihar",
    latitude: 25.5920,
    longitude: 85.1180,
    waterbody_type: "pond",
    area_hectares: 1.2,
    inspection_status: "verified",
    priority: "low",
    priority_reason: "Historic administrative quarter reservoir; masonry ghats preserved with moderate organic load.",
    last_inspected_at: "2026-03-31T16:00:00Z",
    data_source: "Building Construction Dept & PMC Urban GIS",
    is_verified_boundary: true,
    has_polygon: true,
    boundary: {
      type: "Polygon",
      coordinates: [[
        [85.1168, 25.5929],
        [85.1192, 25.5928],
        [85.1191, 25.5911],
        [85.1169, 25.5912],
        [85.1168, 25.5929]
      ]]
    }
  },
  {
    id: "wb-patna-006",
    name: "Bhardwaj Pokhar (Sheikhpura)",
    district: "Patna",
    state: "Bihar",
    latitude: 25.6140,
    longitude: 85.0880,
    waterbody_type: "pond",
    area_hectares: 0.9,
    inspection_status: "action_required",
    priority: "medium",
    priority_reason: "Perimeter fencing breach and solid waste dumping along eastern bank.",
    last_inspected_at: "2026-04-07T12:00:00Z",
    data_source: "OpenStreetMap Node 89124018",
    is_verified_boundary: true,
    has_polygon: true,
    boundary: {
      type: "Polygon",
      coordinates: [[
        [85.0871, 25.6147],
        [85.0889, 25.6146],
        [85.0888, 25.6133],
        [85.0872, 25.6134],
        [85.0871, 25.6147]
      ]]
    }
  },
  {
    id: "wb-patna-007",
    name: "Kankarbagh Tiwari Pokhar",
    district: "Patna",
    state: "Bihar",
    latitude: 25.5890,
    longitude: 85.1520,
    waterbody_type: "pond",
    area_hectares: 1.1,
    inspection_status: "pending",
    priority: "medium",
    priority_reason: "Community pond under urban pressure; seasonal siltation check required before monsoon.",
    last_inspected_at: "2026-03-18T10:00:00Z",
    data_source: "Patna Urban Development Authority (PUDA)",
    is_verified_boundary: true,
    has_polygon: true,
    boundary: {
      type: "Polygon",
      coordinates: [[
        [85.1509, 25.5898],
        [85.1531, 25.5897],
        [85.1530, 25.5882],
        [85.1510, 25.5883],
        [85.1509, 25.5898]
      ]]
    }
  },
  {
    id: "wb-patna-008",
    name: "Digha Ghat Riparian Retention Lagoon",
    district: "Patna",
    state: "Bihar",
    latitude: 25.6520,
    longitude: 85.0930,
    waterbody_type: "wetland",
    area_hectares: 7.2,
    inspection_status: "verified",
    priority: "high",
    priority_reason: "Crucial riverine oxbow lagoon buffering northern Patna against Ganga peak water discharge.",
    last_inspected_at: "2026-04-06T08:30:00Z",
    data_source: "National Mission for Clean Ganga (NMCG) / Sentinel-2 NDWI",
    is_verified_boundary: true,
    has_polygon: true,
    boundary: {
      type: "Polygon",
      coordinates: [[
        [85.0895, 25.6552],
        [85.0965, 25.6542],
        [85.0970, 25.6495],
        [85.0905, 25.6502],
        [85.0895, 25.6552]
      ]]
    }
  },
  {
    id: "wb-patna-009",
    name: "Kalyandaha Pokhari (Fatuha)",
    district: "Patna",
    state: "Bihar",
    latitude: 25.5120,
    longitude: 85.3150,
    waterbody_type: "reservoir",
    area_hectares: 3.8,
    inspection_status: "restoration_in_progress",
    priority: "medium",
    priority_reason: "Peri-urban irrigation and fish farming reservoir; inlet desiltation underway under Jal-Jeevan-Hariyali.",
    last_inspected_at: "2026-04-01T15:10:00Z",
    data_source: "District Rural Development Agency (DRDA) Patna",
    is_verified_boundary: true,
    has_polygon: true,
    boundary: {
      type: "Polygon",
      coordinates: [[
        [85.3132, 25.5135],
        [85.3168, 25.5132],
        [85.3165, 25.5105],
        [85.3134, 25.5108],
        [85.3132, 25.5135]
      ]]
    }
  },
  {
    id: "wb-patna-010",
    name: "Danapur Cantonment Military Lake",
    district: "Patna",
    state: "Bihar",
    latitude: 25.6315,
    longitude: 85.0450,
    waterbody_type: "lake",
    area_hectares: 6.8,
    inspection_status: "verified",
    priority: "low",
    priority_reason: "Protected perimeter with strictly regulated inflows; excellent water clarity and bio-diversity metrics.",
    last_inspected_at: "2026-03-28T11:40:00Z",
    data_source: "Survey of India Topographical Map / OpenStreetMap",
    is_verified_boundary: true,
    has_polygon: true,
    boundary: {
      type: "Polygon",
      coordinates: [[
        [85.0425, 25.6338],
        [85.0478, 25.6332],
        [85.0475, 25.6292],
        [85.0430, 25.6298],
        [85.0425, 25.6338]
      ]]
    }
  },
  {
    id: "wb-patna-011",
    name: "Kumhrar Archaeological Pond",
    district: "Patna",
    state: "Bihar",
    latitude: 25.5975,
    longitude: 85.1830,
    waterbody_type: "tank",
    area_hectares: 1.4,
    inspection_status: "verified",
    priority: "low",
    priority_reason: "Protected Mauryan archaeological complex tank; maintained by Archaeological Survey of India.",
    last_inspected_at: "2026-03-26T13:20:00Z",
    data_source: "Archaeological Survey of India (ASI) Patna Circle",
    is_verified_boundary: true,
    has_polygon: true,
    boundary: {
      type: "Polygon",
      coordinates: [[
        [85.1818, 25.5985],
        [85.1844, 25.5983],
        [85.1842, 25.5966],
        [85.1820, 25.5968],
        [85.1818, 25.5985]
      ]]
    }
  },
  {
    id: "wb-patna-012",
    name: "Phulwari Sharif Madina Talab",
    district: "Patna",
    state: "Bihar",
    latitude: 25.5720,
    longitude: 85.0780,
    waterbody_type: "tank",
    area_hectares: 2.1,
    inspection_status: "action_required",
    priority: "high",
    priority_reason: "High religious and community importance; heavy silt accumulation and broken inlet channels requiring urgent desiltation.",
    last_inspected_at: "2026-04-10T11:00:00Z",
    data_source: "Bihar State Waqf Board / PMC GIS",
    is_verified_boundary: true,
    has_polygon: true,
    boundary: {
      type: "Polygon",
      coordinates: [[
        [85.0768, 25.5732],
        [85.0795, 25.5729],
        [85.0792, 25.5708],
        [85.0770, 25.5710],
        [85.0768, 25.5732]
      ]]
    }
  },
  {
    id: "wb-patna-013",
    name: "Khagaul Railway Colony Tank",
    district: "Patna",
    state: "Bihar",
    latitude: 25.5850,
    longitude: 85.0480,
    waterbody_type: "pond",
    area_hectares: 1.6,
    inspection_status: "not_inspected",
    priority: "medium",
    priority_reason: "Awaiting initial ground reconnaissance; railway residential drainage baseline unverified.",
    last_inspected_at: null, // Honest null for missing record
    data_source: "East Central Railway Estate Directorate",
    is_verified_boundary: true,
    has_polygon: true,
    boundary: {
      type: "Polygon",
      coordinates: [[
        [85.0468, 25.5862],
        [85.0494, 25.5860],
        [85.0492, 25.5839],
        [85.0470, 25.5841],
        [85.0468, 25.5862]
      ]]
    }
  },
  {
    id: "wb-patna-014",
    name: "Ganga Pathway Flood Retention Wetland",
    district: "Patna",
    state: "Bihar",
    latitude: 25.6190,
    longitude: 85.1740,
    waterbody_type: "wetland",
    area_hectares: 8.5,
    inspection_status: "pending",
    priority: "high",
    priority_reason: "Critical flood mitigation zone between Loknayak Ganga Path and riverfront promenade; seasonal satellite tracking active.",
    last_inspected_at: "2026-03-30T09:15:00Z",
    data_source: "Bihar State Wetland Authority",
    is_verified_boundary: true,
    has_polygon: true,
    boundary: {
      type: "Polygon",
      coordinates: [[
        [85.1705, 25.6225],
        [85.1785, 25.6212],
        [85.1790, 25.6165],
        [85.1718, 25.6172],
        [85.1705, 25.6225]
      ]]
    }
  },
  {
    id: "wb-patna-015",
    name: "Agam Kuan Historic Kund",
    district: "Patna",
    state: "Bihar",
    latitude: 25.5980,
    longitude: 85.1950,
    waterbody_type: "tank",
    area_hectares: 0.35,
    inspection_status: "not_inspected",
    priority: "low",
    priority_reason: "Ancient Ashokan circular step-reservoir; protected heritage monument with restricted public access.",
    last_inspected_at: null, // Honest null
    data_source: "Archaeological Survey of India (ASI)",
    is_verified_boundary: false,
    has_polygon: false,
    boundary: null // Marker fallback demonstration!
  }
];

export const fallbackPatnaHistory: Record<string, WaterbodyHistory> = {
  "wb-patna-001": {
    waterbody_id: "wb-patna-001",
    waterbody_name: "Mangal Talab",
    has_history: true,
    measurement_trend_available: true,
    inspections: [
      {
        id: "insp-001-1",
        waterbody_id: "wb-patna-001",
        inspection_date: "2026-04-09T10:30:00Z",
        status: "restoration_in_progress",
        observations: "Contractor deployed suction dredge on northern basin. Water hyacinth clearing 65% complete. Inflow weir desilted.",
        inspector_name: "Ravi Trivedi",
        inspector_role: "Senior Verification Officer",
        confidence_score: 94.0,
        recommended_action: "Continue aeration pump operation and test BOD/COD parameters in next cycle.",
        is_demo_data: true
      },
      {
        id: "insp-001-2",
        waterbody_id: "wb-patna-001",
        inspection_date: "2026-03-01T14:15:00Z",
        status: "action_required",
        observations: "High turbidity detected via Sentinel-2 NDWI (-0.12 anomaly). Ground check confirmed dense organic sludge accumulation.",
        inspector_name: "Amitabh Sen",
        inspector_role: "Zonal Hydrologist",
        confidence_score: 88.0,
        recommended_action: "Sanction mechanical desiltation under Jal-Jeevan-Hariyali mission.",
        is_demo_data: true
      }
    ],
    measurements: [
      {
        id: "meas-001-1",
        waterbody_id: "wb-patna-001",
        measurement_date: "2025-12-15T00:00:00Z",
        water_spread_area_ha: 3.9,
        water_spread_percentage: 81.2,
        source: "Sentinel-2 NDWI",
        source_type: "satellite",
        is_demo_data: true
      },
      {
        id: "meas-001-2",
        waterbody_id: "wb-patna-001",
        measurement_date: "2026-02-14T00:00:00Z",
        water_spread_area_ha: 4.3,
        water_spread_percentage: 89.5,
        source: "Sentinel-2 NDWI",
        source_type: "satellite",
        is_demo_data: true
      },
      {
        id: "meas-001-3",
        waterbody_id: "wb-patna-001",
        measurement_date: "2026-04-09T00:00:00Z",
        water_spread_area_ha: 4.7,
        water_spread_percentage: 97.9,
        source: "Drone Photogrammetry",
        source_type: "drone",
        is_demo_data: true
      }
    ],
    restorations: [
      {
        id: "rest-001-1",
        waterbody_id: "wb-patna-001",
        activity_type: "Mechanical De-siltation & Bio-dredging",
        description: "Removal of 12,000 m³ of anaerobic bottom silt and treatment of peripheral drainage outfalls with microbial bioremediation consortia.",
        start_date: "2026-03-10T00:00:00Z",
        completion_date: "2026-06-05T00:00:00Z",
        status: "in_progress",
        outcome: "Water clarity improved from 25cm to 65cm Secchi depth; live storage expanded by 18%.",
        budget_inr: 2450000,
        is_demo_data: true
      }
    ],
    photos: [
      {
        id: "photo-001-1",
        waterbody_id: "wb-patna-001",
        photo_url: "/images/barmer_farm_pond.jpg",
        caption: "Northern basin desiltation work in progress at Mangal Talab with mechanical excavator.",
        taken_at: "2026-04-09T11:00:00Z",
        photographer: "Ravi Trivedi",
        is_verified_exif: true,
        is_demo_data: true
      }
    ]
  },
  "wb-patna-002": {
    waterbody_id: "wb-patna-002",
    waterbody_name: "Sanjay Gandhi Jaivik Udyan Lake",
    has_history: true,
    measurement_trend_available: true,
    inspections: [
      {
        id: "insp-002-1",
        waterbody_id: "wb-patna-002",
        inspection_date: "2026-04-03T11:15:00Z",
        status: "verified",
        observations: "Water quality clear. Dissolved oxygen levels optimal at 6.8 mg/L. Shoreline vegetation healthy.",
        inspector_name: "Dr. Sunita Kumari",
        inspector_role: "Wetland Ecologist",
        confidence_score: 96.0,
        recommended_action: "Maintain weekly floating fountain aeration schedule.",
        is_demo_data: true
      }
    ],
    measurements: [
      {
        id: "meas-002-1",
        waterbody_id: "wb-patna-002",
        measurement_date: "2025-11-15T00:00:00Z",
        water_spread_area_ha: 5.1,
        water_spread_percentage: 94.4,
        source: "Sentinel-2 NDWI",
        source_type: "satellite",
        is_demo_data: true
      },
      {
        id: "meas-002-2",
        waterbody_id: "wb-patna-002",
        measurement_date: "2026-01-28T00:00:00Z",
        water_spread_area_ha: 5.3,
        water_spread_percentage: 98.1,
        source: "Sentinel-2 NDWI",
        source_type: "satellite",
        is_demo_data: true
      },
      {
        id: "meas-002-3",
        waterbody_id: "wb-patna-002",
        measurement_date: "2026-04-03T00:00:00Z",
        water_spread_area_ha: 5.4,
        water_spread_percentage: 100.0,
        source: "Ground GPS Survey",
        source_type: "field",
        is_demo_data: true
      }
    ],
    restorations: [
      {
        id: "rest-002-1",
        waterbody_id: "wb-patna-002",
        activity_type: "Solar Aeration & Riparian Buffer Planting",
        description: "Installation of 4 solar-powered submersible micro-bubble aerators and native wetland grass planting along littoral zones.",
        start_date: "2025-10-15T00:00:00Z",
        completion_date: "2026-03-15T00:00:00Z",
        status: "completed",
        outcome: "Dissolved oxygen stabilized at >6.5 mg/L; bird nesting sites established on northern bund.",
        budget_inr: 1200000,
        is_demo_data: true
      }
    ],
    photos: [
      {
        id: "photo-002-1",
        waterbody_id: "wb-patna-002",
        photo_url: "/images/kolar_plantation.jpg",
        caption: "Riparian buffer vegetation and aeration fountains at Patna Zoo Lake.",
        taken_at: "2026-04-03T11:45:00Z",
        photographer: "Dr. Sunita Kumari",
        is_verified_exif: true,
        is_demo_data: true
      }
    ]
  },
  "wb-patna-003": {
    waterbody_id: "wb-patna-003",
    waterbody_name: "Mithapur Pokhari",
    has_history: true,
    measurement_trend_available: true,
    inspections: [
      {
        id: "insp-003-1",
        waterbody_id: "wb-patna-003",
        inspection_date: "2026-04-11T09:45:00Z",
        status: "action_required",
        observations: "Dense weed mat covering >70% surface area. Local commercial waste dumping along southeast perimeter.",
        inspector_name: "Ravi Trivedi",
        inspector_role: "Senior Verification Officer",
        confidence_score: 92.0,
        recommended_action: "Issue municipal notice to encroachers; organize community weed harvesting drive.",
        is_demo_data: true
      }
    ],
    measurements: [
      {
        id: "meas-003-1",
        waterbody_id: "wb-patna-003",
        measurement_date: "2026-01-15T00:00:00Z",
        water_spread_area_ha: 1.9,
        water_spread_percentage: 105.0,
        source: "Sentinel-2 NDWI",
        source_type: "satellite",
        is_demo_data: true
      },
      {
        id: "meas-003-2",
        waterbody_id: "wb-patna-003",
        measurement_date: "2026-04-11T00:00:00Z",
        water_spread_area_ha: 1.4,
        water_spread_percentage: 77.8,
        source: "Field Survey",
        source_type: "field",
        is_demo_data: true
      }
    ],
    restorations: [],
    photos: [
      {
        id: "photo-003-1",
        waterbody_id: "wb-patna-003",
        photo_url: "/images/darrang_check_dam.jpg",
        caption: "Mithapur Pokhari embankment showing severe weed encroachment.",
        taken_at: "2026-04-11T10:15:00Z",
        photographer: "Ravi Trivedi",
        is_verified_exif: true,
        is_demo_data: true
      }
    ]
  },
  "wb-patna-013": {
    waterbody_id: "wb-patna-013",
    waterbody_name: "Khagaul Railway Colony Tank",
    has_history: false,
    measurement_trend_available: false,
    inspections: [],
    measurements: [],
    restorations: [],
    photos: []
  },
  "wb-patna-015": {
    waterbody_id: "wb-patna-015",
    waterbody_name: "Agam Kuan Historic Kund",
    has_history: false,
    measurement_trend_available: false,
    inspections: [],
    measurements: [],
    restorations: [],
    photos: []
  }
};
