import axios from "axios";
import { getApiBaseUrl } from "../api";
import { MapLayerItem, SearchResultItem, FeatureDetail, StudyAreaItem } from "./mapTypes";

const api = axios.create({
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const baseURL = getApiBaseUrl();
  config.baseURL = baseURL;
  return config;
});

// Fallback layer registry in case backend is offline
export const FALLBACK_LAYERS: MapLayerItem[] = [
  {
    id: "admin-national",
    name: "India National Boundary",
    category: "administrative",
    geometry_type: "Polygon",
    color: "#e2e8f0",
    fill_color: "transparent",
    border_color: "#cbd5e1",
    line_width: 2.5,
    opacity: 0.9,
    default_visible: true,
    visible: true,
    min_zoom: 3,
    max_zoom: 18,
    source: "Survey of India (SOIN)",
    source_url: "https://surveyofindia.gov.in",
    license: "GODL-India",
    description: "Sovereign Republic of India national border alignment.",
    feature_count: 1
  },
  {
    id: "admin-states",
    name: "State Boundaries",
    category: "administrative",
    geometry_type: "Polygon",
    color: "#94a3b8",
    fill_color: "#334155",
    border_color: "#64748b",
    line_width: 1.5,
    opacity: 0.25,
    default_visible: true,
    visible: true,
    min_zoom: 3,
    max_zoom: 14,
    source: "Survey of India Administrative Series",
    source_url: "https://surveyofindia.gov.in",
    license: "GODL-India",
    description: "State and Union Territory borders across India.",
    feature_count: 9
  },
  {
    id: "admin-districts",
    name: "District Boundaries",
    category: "administrative",
    geometry_type: "Polygon",
    color: "#64748b",
    fill_color: "#1e293b",
    border_color: "#475569",
    line_width: 1.0,
    opacity: 0.35,
    default_visible: true,
    visible: true,
    min_zoom: 5,
    max_zoom: 18,
    source: "Ministry of Panchayati Raj / Census GIS",
    source_url: "https://mopr.gov.in",
    license: "GODL-India",
    description: "District administrative divisions for priority watershed zones.",
    feature_count: 8
  },
  {
    id: "hydro-watersheds",
    name: "Watershed & Catchment Basins",
    category: "hydrological",
    geometry_type: "Polygon",
    color: "#06b6d4",
    fill_color: "#0891b2",
    border_color: "#06b6d4",
    line_width: 1.8,
    opacity: 0.35,
    default_visible: true,
    visible: true,
    min_zoom: 4,
    max_zoom: 18,
    source: "Central Ground Water Board (CGWB) & SLUSI",
    source_url: "http://cgwb.gov.in",
    license: "Public Domain / Official Government GIS",
    description: "Sub-basin hydrological micro-watersheds with infiltration indexes.",
    feature_count: 6
  },
  {
    id: "hydro-rivers",
    name: "Rivers & Major Streams",
    category: "hydrological",
    geometry_type: "LineString",
    color: "#38bdf8",
    fill_color: "transparent",
    border_color: "#38bdf8",
    line_width: 2.2,
    opacity: 0.85,
    default_visible: true,
    visible: true,
    min_zoom: 4,
    max_zoom: 18,
    source: "India-WRIS / CWC Drainage Atlas",
    source_url: "https://indiawris.gov.in",
    license: "GODL-India",
    description: "Perennial river centerlines and major stream corridors.",
    feature_count: 8
  },
  {
    id: "hydro-drainage",
    name: "Drainage Channels & Stream Network",
    category: "hydrological",
    geometry_type: "LineString",
    color: "#22d3ee",
    fill_color: "transparent",
    border_color: "#22d3ee",
    line_width: 1.2,
    opacity: 0.75,
    default_visible: true,
    visible: true,
    min_zoom: 6,
    max_zoom: 18,
    source: "State Water Resources Departments & NRSC CartoDEM Drainage",
    source_url: "https://bhuvan.nrsc.gov.in",
    license: "Open Data Terms",
    description: "Secondary stream orders, irrigation feeder nullahs, and seasonal tributaries.",
    feature_count: 5
  },
  {
    id: "hydro-waterbodies",
    name: "Lakes, Ponds & Reservoirs",
    category: "hydrological",
    geometry_type: "Polygon",
    color: "#0284c7",
    fill_color: "#0284c7",
    border_color: "#38bdf8",
    line_width: 1.5,
    opacity: 0.75,
    default_visible: true,
    visible: true,
    min_zoom: 6,
    max_zoom: 18,
    source: "ISRO Bhuvan Surface Water Spread Registry & Bihar WRD",
    source_url: "https://bhuvan.nrsc.gov.in",
    license: "ISRO Data Sharing Terms",
    description: "Surface water spread polygons mapped via Sentinel-2 NDWI.",
    feature_count: 8
  },
  {
    id: "interventions-checkdams",
    name: "Check Dams & Gully Plugs",
    category: "interventions",
    geometry_type: "Point",
    color: "#f59e0b",
    fill_color: "#f59e0b",
    border_color: "#b45309",
    line_width: 2.0,
    opacity: 0.95,
    default_visible: true,
    visible: true,
    min_zoom: 5,
    max_zoom: 18,
    source: "Jal Shakti Abhiyan / NREGA Asset GIS",
    source_url: "https://jalshakti-dowr.gov.in",
    license: "Government Internal Asset GIS",
    description: "Masonry, gabion, and concrete runoff retarding check dams.",
    feature_count: 3
  },
  {
    id: "interventions-farmponds",
    name: "Farm Ponds & Water Harvesting Tanks",
    category: "interventions",
    geometry_type: "Point",
    color: "#10b981",
    fill_color: "#10b981",
    border_color: "#047857",
    line_width: 2.0,
    opacity: 0.95,
    default_visible: true,
    visible: true,
    min_zoom: 5,
    max_zoom: 18,
    source: "District Rural Development Agency (DRDA) Field GIS",
    source_url: "https://nrega.nic.in",
    license: "GODL-India",
    description: "On-farm rainwater harvesting structures and lined/unlined farm ponds.",
    feature_count: 2
  },
  {
    id: "interventions-percolation",
    name: "Percolation Tanks & Infiltration Basins",
    category: "interventions",
    geometry_type: "Point",
    color: "#8b5cf6",
    fill_color: "#8b5cf6",
    border_color: "#6d28d9",
    line_width: 2.0,
    opacity: 0.95,
    default_visible: true,
    visible: true,
    min_zoom: 5,
    max_zoom: 18,
    source: "CGWB Artificial Recharge Master Plan",
    source_url: "http://cgwb.gov.in",
    license: "Public Domain GIS",
    description: "Dedicated aquifer recharge basins and deep percolation tanks.",
    feature_count: 2
  },
  {
    id: "interventions-traditional",
    name: "Traditional Conservation (Ahar-Pyne & Bunds)",
    category: "interventions",
    geometry_type: "LineString",
    color: "#ec4899",
    fill_color: "transparent",
    border_color: "#ec4899",
    line_width: 2.0,
    opacity: 0.85,
    default_visible: false,
    visible: false,
    min_zoom: 6,
    max_zoom: 18,
    source: "Bihar Minor Water Resources Dept & Community Mapping",
    source_url: "https://mwrd.bih.nic.in",
    license: "State GIS Archive",
    description: "Heritage floodwater diversion ahars, feeder pynes, and contour bunds.",
    feature_count: 1
  }
];

export async function fetchMapLayers(): Promise<MapLayerItem[]> {
  try {
    const { data } = await api.get("/api/v1/map/layers");
    if (data?.data && Array.isArray(data.data)) {
      return data.data.map((l: any) => ({
        ...l,
        visible: l.default_visible ?? true
      }));
    }
  } catch {
    // Fallback
  }
  return FALLBACK_LAYERS;
}

export async function fetchAdministrativeBoundaries(level: string = "all", bbox?: string): Promise<any> {
  try {
    const params: Record<string, string> = { level };
    if (bbox) params.bbox = bbox;
    const { data } = await api.get("/api/v1/map/boundaries/administrative", { params });
    if (data?.data) return data.data;
  } catch {
    // Fallback
  }
  return { type: "FeatureCollection", features: [] };
}

export async function fetchWatershedBoundaries(params?: { basin_id?: string; state?: string; district?: string; bbox?: string }): Promise<any> {
  try {
    const { data } = await api.get("/api/v1/map/boundaries/watersheds", { params });
    if (data?.data) return data.data;
  } catch {
    // Fallback
  }
  return { type: "FeatureCollection", features: [] };
}

export async function fetchHydrology(type: string = "all", bbox?: string): Promise<any> {
  try {
    const params: Record<string, string> = { type };
    if (bbox) params.bbox = bbox;
    const { data } = await api.get("/api/v1/map/hydrology", { params });
    if (data?.data) return data.data;
  } catch {
    // Fallback
  }
  return { type: "FeatureCollection", features: [] };
}

export async function fetchInterventions(params?: { kind?: string; status?: string; district?: string; bbox?: string }): Promise<any> {
  try {
    const { data } = await api.get("/api/v1/map/interventions", { params });
    if (data?.data) return data.data;
  } catch {
    // Fallback
  }
  return { type: "FeatureCollection", features: [] };
}

export async function searchMapFeatures(query: string, limit: number = 10): Promise<SearchResultItem[]> {
  if (!query || !query.trim()) return [];
  try {
    const { data } = await api.get("/api/v1/map/search", { params: { q: query.trim(), limit } });
    if (data?.data?.results) return data.data.results;
  } catch {
    // Client-side fallback search
  }

  // Quick fallback search for common queries if backend unreachable
  const q = query.trim().toLowerCase();
  const fallbackResults: SearchResultItem[] = [];

  // Check coordinates
  const coordMatch = query.match(/^\s*([+-]?\d+(?:\.\d+)?)[,\s]+([+-]?\d+(?:\.\d+)?)\s*$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    return [{
      id: `coord-${lat}-${lon}`,
      title: `Coordinates: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`,
      subtitle: "WGS84 Lat/Lon Coordinates",
      category: "coordinate",
      center: [lon, lat],
      zoom: 14,
      feature_type: "coordinate_point"
    }];
  }

  if (q.includes("bihar")) {
    fallbackResults.push({
      id: "state-bihar",
      title: "Bihar (State)",
      subtitle: "State in India · Capital: Patna",
      category: "state",
      center: [85.5, 25.6],
      zoom: 6.5,
      feature_type: "state"
    });
  }
  if (q.includes("patna")) {
    fallbackResults.push({
      id: "dist-patna",
      title: "Patna District",
      subtitle: "District in Bihar · Rivers: Ganga, Son, Punpun",
      category: "district",
      center: [85.1376, 25.5941],
      zoom: 10,
      feature_type: "district"
    });
    fallbackResults.push({
      id: "WS-GANGA-PATNA-01",
      title: "Lower Ganga - Punpun Catchment Basin",
      subtitle: "Hydrological Catchment · Area: 1840.5 km²",
      category: "watershed",
      center: [85.15, 25.55],
      zoom: 10,
      feature_type: "watershed"
    });
  }
  if (q.includes("barmer") || q.includes("luni")) {
    fallbackResults.push({
      id: "ws-1",
      title: "Luni River Sub-basin Catchment",
      subtitle: "Arid Ephemeral Basin · Barmer, Rajasthan",
      category: "watershed",
      center: [71.38, 25.75],
      zoom: 9.5,
      feature_type: "watershed"
    });
  }
  if (q.includes("assam") || q.includes("darrang") || q.includes("brahma")) {
    fallbackResults.push({
      id: "ws-2",
      title: "Brahmaputra North Bank Sub-basin",
      subtitle: "Floodplain Basin · Darrang, Assam",
      category: "watershed",
      center: [92.02, 26.45],
      zoom: 10,
      feature_type: "watershed"
    });
  }
  if (q.includes("kolar") || q.includes("palar")) {
    fallbackResults.push({
      id: "WS-PALAR-03",
      title: "Palar River Upper Catchment",
      subtitle: "Semi-arid Granite Watershed · Kolar, Karnataka",
      category: "watershed",
      center: [78.13, 13.14],
      zoom: 10,
      feature_type: "watershed"
    });
  }

  return fallbackResults;
}

export async function fetchFeatureDetails(featureType: string, featureId: string): Promise<FeatureDetail | null> {
  try {
    const { data } = await api.get(`/api/v1/map/features/${featureType}/${featureId}`);
    if (data?.data) return data.data;
  } catch {
    // Fallback
  }
  return null;
}

// ---------------------------------------------------------------------------
// Preset Watershed Study Areas API (Section 10 Requirement)
// ---------------------------------------------------------------------------

export const FALLBACK_STUDY_AREAS: StudyAreaItem[] = [
  {
    id: "patna-bihar",
    name: "Patna, Bihar",
    aliases: ["Patna", "Patna Bihar", "Patna Pilot", "Lower Ganga", "Punpun Basin"],
    region: "Patna, Bihar",
    boundary_status: "verified",
    boundary_source: "Bihar Water Resources Department (WRD) & Survey of India",
    center: [85.1376, 25.5941],
    zoom: 12.0,
    bbox: [85.0000, 25.4800, 85.3800, 25.6800],
    area_sqkm: 320.5,
    purpose: "Ground-truth waterbody monitoring, urban wetlands, rejuvenation and Sentinel-2 change detection.",
    description: "Lower Ganga-Punpun floodplain pilot study area with 15 verified ground truth waterbody inspection sites.",
    disambiguation_notes: null,
    available_layers: ["boundary-watershed", "hydro-streams", "hydro-waterbodies", "interventions-checkdams", "interventions-farmponds"],
    layer_counts: { streams: 6, waterbodies: 15, interventions: 18 },
    waterbody_dataset_status: "imported",
    has_ground_truth_records: true,
    last_updated: "2026-04-18",
    has_boundary_geometry: true,
    geometry: {
      type: "Polygon",
      coordinates: [[[85.00, 25.50], [85.35, 25.48], [85.38, 25.66], [85.15, 25.68], [85.00, 25.62], [85.00, 25.50]]]
    }
  },
  {
    id: "kolar-sub-basin",
    name: "Kolar Sub-Basin",
    aliases: ["Kolar", "Kolar Sub Basin", "Kolar Watershed", "Kolar MP"],
    region: "Madhya Pradesh, pending geographic verification",
    boundary_status: "pending_verification",
    boundary_source: "Central Ground Water Board (CGWB) & Narmada Basin Authority (Provisional)",
    center: [77.10, 22.85],
    zoom: 10.0,
    bbox: [76.80, 22.65, 77.45, 23.10],
    area_sqkm: 1350.4,
    purpose: "Watershed assessment, drainage analysis, water-body mapping and intervention monitoring.",
    description: "Narmada tributary catchment in Sehore and Raisen districts feeding Kolar Dam. Requires administrator confirmation regarding disambiguation from Kolar, Karnataka.",
    disambiguation_notes: "Identified as the Kolar River watershed (Narmada Basin, MP), not to be confused with Kolar District in Karnataka. Upload official SLUSI shapefile if alternate delineation is intended.",
    available_layers: ["boundary-watershed", "hydro-streams", "hydro-waterbodies", "interventions-checkdams", "interventions-farmponds"],
    layer_counts: { streams: 8, waterbodies: 0, interventions: 12 },
    waterbody_dataset_status: "not_imported",
    has_ground_truth_records: false,
    last_updated: "2026-04-10",
    has_boundary_geometry: true,
    geometry: {
      type: "Polygon",
      coordinates: [[[76.85, 22.65], [77.30, 22.65], [77.45, 22.95], [77.20, 23.10], [76.80, 22.95], [76.85, 22.65]]]
    }
  },
  {
    id: "raichur-tungabhadra-catchment",
    name: "Raichur–Tungabhadra Catchment",
    aliases: ["Raichur", "Tungabhadra Catchment", "Raichur Tungabhadra", "Tungabhadra Basin"],
    region: "Karnataka (extending across state boundaries)",
    boundary_status: "sample_curated",
    boundary_source: "Krishna–Tungabhadra Basin Atlas & Karnataka WRD (Provisional Multi-State Boundary)",
    center: [77.15, 15.95],
    zoom: 9.5,
    bbox: [76.50, 15.30, 77.65, 16.30],
    area_sqkm: 3120.8,
    purpose: "River network analysis, water-body monitoring and conservation-structure mapping.",
    description: "Semi-arid inter-state river confluence catchment between Tungabhadra and Krishna rivers, characterized by intense canal irrigation and gully erosion.",
    disambiguation_notes: "Catchment extends across Raichur (Karnataka), Jogulamba Gadwal (Telangana) and Kurnool (Andhra Pradesh).",
    available_layers: ["boundary-watershed", "hydro-streams", "hydro-waterbodies", "interventions-checkdams", "interventions-farmponds", "interventions-recharge"],
    layer_counts: { streams: 16, waterbodies: 9, interventions: 21 },
    has_boundary_geometry: true,
    geometry: {
      type: "Polygon",
      coordinates: [[[76.50, 15.40], [77.20, 15.30], [77.65, 15.85], [77.50, 16.30], [76.80, 16.20], [76.50, 15.40]]]
    }
  },
  {
    id: "anantapur-arid-watershed",
    name: "Anantapur Arid Watershed",
    aliases: ["Anantapur", "Ananthapuramu", "Anantapur Arid Watershed", "Rayalaseema"],
    region: "Andhra Pradesh",
    boundary_status: "verified",
    boundary_source: "AP Space Applications Centre (APSAC) & CGWB Drought Area Program",
    center: [77.60, 14.68],
    zoom: 9.5,
    bbox: [77.10, 14.15, 78.10, 15.15],
    area_sqkm: 2840.5,
    purpose: "Dryland watershed analysis, vegetation monitoring, water harvesting and land-degradation assessment.",
    description: "Severely rain-shadowed drought-prone zone in southern AP with high subsurface infiltration potential and extensive farm pond construction programs.",
    disambiguation_notes: null,
    available_layers: ["boundary-watershed", "hydro-streams", "hydro-waterbodies", "interventions-farmponds", "interventions-recharge"],
    layer_counts: { streams: 11, waterbodies: 6, interventions: 24 },
    has_boundary_geometry: true,
    geometry: {
      type: "Polygon",
      coordinates: [[[77.10, 14.20], [77.85, 14.15], [78.10, 14.90], [77.70, 15.15], [77.20, 14.85], [77.10, 14.20]]]
    }
  },
  {
    id: "bundelkhand-recharge-zone",
    name: "Bundelkhand Recharge Zone",
    aliases: ["Bundelkhand", "Bundelkhand Recharge", "Bundelkhand Watershed", "Ken-Betwa Zone"],
    region: "Uttar Pradesh and Madhya Pradesh",
    boundary_status: "verified",
    boundary_source: "CGWB Special Bundelkhand Drought Mitigation Project & SLUSI",
    center: [79.45, 25.10],
    zoom: 9.0,
    bbox: [78.60, 24.40, 80.40, 25.75],
    area_sqkm: 4210.0,
    purpose: "Groundwater recharge planning, drainage analysis, water harvesting and vegetation monitoring.",
    description: "Hard-rock crystalline terrain spanning Jhansi, Lalitpur, Tikamgarh, and Mahoba prone to recurring agricultural droughts and seasonal stream desiccation.",
    disambiguation_notes: null,
    available_layers: ["boundary-watershed", "hydro-streams", "hydro-waterbodies", "interventions-checkdams", "interventions-farmponds"],
    layer_counts: { streams: 22, waterbodies: 14, interventions: 35 },
    has_boundary_geometry: true,
    geometry: {
      type: "Polygon",
      coordinates: [[[78.60, 24.50], [79.80, 24.40], [80.40, 25.20], [79.90, 25.75], [78.75, 25.60], [78.60, 24.50]]]
    }
  },
  {
    id: "vidarbha-basin",
    name: "Vidarbha Basin",
    aliases: ["Vidarbha", "Vidarbha Watershed", "Vidarbha Basin", "Wainganga-Wardha"],
    region: "Maharashtra",
    boundary_status: "sample_curated",
    boundary_source: "Godavari-Wainganga Sub-basin Authority & GSDA Maharashtra (Provisional)",
    center: [79.25, 20.90],
    zoom: 8.8,
    bbox: [78.20, 20.10, 80.25, 21.65],
    area_sqkm: 4850.2,
    purpose: "Water-body assessment, agricultural landscape monitoring, vegetation analysis and watershed intervention mapping.",
    description: "Black-cotton basaltic plateau covering Nagpur, Wardha, and Chandrapur districts; focus area for farm percolation ponds and gully plugging.",
    disambiguation_notes: "Wardha-Wainganga catchment delineation. Verify micro-watershed boundary against local Jalyukt Shivar GIS layers.",
    available_layers: ["boundary-watershed", "hydro-streams", "hydro-waterbodies", "interventions-checkdams", "interventions-farmponds"],
    layer_counts: { streams: 19, waterbodies: 11, interventions: 28 },
    has_boundary_geometry: true,
    geometry: {
      type: "Polygon",
      coordinates: [[[78.20, 20.20], [79.60, 20.10], [80.25, 21.10], [79.80, 21.65], [78.40, 21.40], [78.20, 20.20]]]
    }
  },
  {
    id: "thar-canal-command-area",
    name: "Thar Canal Command Area",
    aliases: ["Thar Canal", "Rajasthan Canal Command", "Indira Gandhi Canal Command", "IGNP Command"],
    region: "Western Rajasthan",
    boundary_status: "verified",
    boundary_source: "IGNP Command Area Development Authority & WRD Rajasthan",
    center: [72.10, 27.85],
    zoom: 8.5,
    bbox: [70.80, 26.60, 73.20, 28.80],
    area_sqkm: 5420.0,
    purpose: "Irrigation-command mapping, drainage analysis, water-body monitoring and vegetation-change assessment.",
    description: "Hyper-arid dune landscape converted by the Indira Gandhi Canal network; exhibits acute seepage waterlogging and soil salinization requiring precise spatial monitoring.",
    disambiguation_notes: null,
    available_layers: ["boundary-watershed", "hydro-streams", "hydro-waterbodies", "interventions-farmponds"],
    layer_counts: { streams: 7, waterbodies: 5, interventions: 16 },
    has_boundary_geometry: true,
    geometry: {
      type: "Polygon",
      coordinates: [[[70.80, 26.90], [71.90, 26.60], [73.20, 28.20], [72.60, 28.80], [71.20, 27.90], [70.80, 26.90]]]
    }
  }
];

export async function fetchStudyAreas(query?: string): Promise<StudyAreaItem[]> {
  try {
    const params = query ? { q: query } : {};
    const { data } = await api.get("/api/v1/map/study-areas", { params });
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data;
    }
  } catch {
    // Return fallback
  }

  if (query) {
    const q = query.toLowerCase().trim();
    return FALLBACK_STUDY_AREAS.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.region.toLowerCase().includes(q) ||
        a.aliases.some((al: string) => al.toLowerCase().includes(q))
    );
  }
  return FALLBACK_STUDY_AREAS;
}

export async function fetchStudyAreaDetail(studyAreaId: string): Promise<any> {
  try {
    const { data } = await api.get(`/api/v1/map/study-areas/${studyAreaId}`);
    if (data?.data) return data.data;
  } catch {
    // Return fallback
  }
  const fallback = FALLBACK_STUDY_AREAS.find((a) => a.id === studyAreaId);
  if (fallback) {
    return {
      type: "Feature",
      id: fallback.id,
      properties: { ...fallback },
      geometry: fallback.geometry
    };
  }
  return null;
}

export async function uploadStudyAreaBoundary(
  studyAreaId: string,
  coordinates: number[][][],
  sourceLabel: string = "Admin Uploaded Shapefile"
): Promise<any> {
  const { data } = await api.post(`/api/v1/map/study-areas/${studyAreaId}/upload-boundary`, {
    coordinates,
    source_label: sourceLabel,
  });
  return data?.data;
}

export async function fetchStudyAreaWaterbodies(
  studyAreaId: string,
  params?: { q?: string; status?: string; priority?: string; page?: number; limit?: number }
): Promise<any> {
  try {
    const { data } = await api.get(`/api/v1/study-areas/${studyAreaId}/waterbodies`, { params });
    if (data?.data) return data.data;
  } catch {
    // Fallback
  }
  return { items: [], total: 0, study_area_id: studyAreaId, waterbody_dataset_status: "not_imported" };
}

export async function fetchStudyAreaSummary(studyAreaId: string): Promise<any> {
  try {
    const { data } = await api.get(`/api/v1/study-areas/${studyAreaId}/summary`);
    if (data?.data) return data.data;
  } catch {
    // Fallback
  }
  const fallback = FALLBACK_STUDY_AREAS.find((a) => a.id === studyAreaId);
  return {
    study_area_id: studyAreaId,
    name: fallback?.name || studyAreaId,
    region: fallback?.region || "",
    total_waterbodies: 0,
    by_status: { not_inspected: 0, pending: 0, verified: 0, action_required: 0, restoration_in_progress: 0 },
    by_priority: { high: 0, medium: 0, low: 0 },
    by_type: {},
    total_area_hectares: 0.0,
    verified_boundaries_count: 0,
    waterbody_dataset_status: "not_imported",
    message: "No verified waterbody records are available for this study area yet."
  };
}

export async function importStudyAreaWaterbodies(
  studyAreaId: string,
  items: any[],
  sourceCitation: string = "Admin Field Survey"
): Promise<any> {
  const { data } = await api.post(`/api/v1/study-areas/${studyAreaId}/import-waterbodies`, {
    items,
    source_citation: sourceCitation
  });
  return data?.data;
}


