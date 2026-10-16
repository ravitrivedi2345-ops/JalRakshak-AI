export type LayerCategory = "administrative" | "hydrological" | "interventions";

export type BasemapStyle = "streets" | "satellite" | "topo" | "dark";

export interface MapLayerItem {
  id: string;
  name: string;
  category: LayerCategory;
  geometry_type: "Polygon" | "LineString" | "Point";
  color: string;
  fill_color?: string;
  border_color?: string;
  line_width?: number;
  opacity: number;
  default_visible: boolean;
  visible: boolean;
  min_zoom?: number;
  max_zoom?: number;
  source: string;
  source_url?: string;
  license?: string;
  description: string;
  feature_count?: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: "state" | "district" | "watershed" | "river" | "waterbody" | "intervention" | "coordinate";
  center: [number, number];
  zoom: number;
  bounds?: [[number, number], [number, number]];
  feature_type: string;
  properties?: Record<string, any>;
}

export interface FeatureDetail {
  id: string;
  name: string;
  type: string;
  category: string;
  state?: string;
  district?: string;
  headquarters?: string;
  area_sq_km?: number;
  calculated_area_ha?: number;
  area_hectares?: number;
  mapped_length_km?: number;
  approx_length_km?: number;
  stream_order?: number;
  perennial?: boolean;
  drainage_density?: string;
  percolation_index?: string;
  sub_watersheds?: string[];
  status?: string;
  score?: number;
  capacity_m3?: number;
  storage_status?: string;
  photo_url?: string;
  watershed_id?: string;
  source?: string;
  license?: string;
  verified?: boolean;
  center?: [number, number];
  latitude?: number;
  longitude?: number;
  can_launch_satellite_change?: boolean;
  updated_at?: string;
}

export interface QuickRegionPreset {
  id: string;
  label: string;
  center: [number, number];
  zoom: number;
  bounds?: [[number, number], [number, number]];
  description: string;
}

export type BoundaryValidationStatus = "verified" | "pending_verification" | "sample_curated" | "verified_custom";

export interface StudyAreaItem {
  id: string;
  name: string;
  aliases: string[];
  region: string;
  boundary_status: BoundaryValidationStatus;
  boundary_source?: string | null;
  center: [number, number];
  zoom: number;
  bbox: [number, number, number, number];
  area_sqkm: number;
  calculated_area_ha?: number;
  purpose: string;
  description: string;
  disambiguation_notes?: string | null;
  available_layers: string[];
  layer_counts: {
    streams?: number;
    waterbodies?: number;
    interventions?: number;
  };
  waterbody_dataset_status?: "imported" | "not_imported";
  has_ground_truth_records?: boolean;
  last_updated?: string;
  has_boundary_geometry?: boolean;
  geometry?: any;
}


