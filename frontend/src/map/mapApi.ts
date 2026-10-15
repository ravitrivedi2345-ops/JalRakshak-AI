import axios from "axios";
import { getApiBaseUrl } from "../api";
import { MapLayerItem, SearchResultItem, FeatureDetail } from "./mapTypes";

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
