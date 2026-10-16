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

export type FeatureCategory =
  | "lake_pond"
  | "village_pond_tank"
  | "reservoir"
  | "seasonal_waterbody"
  | "farm_pond"
  | "check_dam"
  | "percolation_tank"
  | "river_stream"
  | "canal_distributary"
  | "waterlogged_area";

export type VerificationStatus =
  | "field_verified"
  | "satellite_derived"
  | "imported_source"
  | "unverified_candidate";

export interface HistoricalWaterSpreadObservation {
  epoch: string;
  date: string;
  sensor: string;
  area_ha: number;
  ndwi_mean: number;
  cloud_cover_pct: number;
  notes?: string;
}

export interface StudyAreaSpatialAnalysis {
  study_area_id: string;
  inventory_metrics: {
    total_waterbody_records: number;
    total_mapped_area_ha: number;
    category_distribution: Record<string, number>;
    verification_breakdown: Record<string, number>;
    data_source_citations: string[];
  };
  historical_water_spread: {
    epochs: Array<{
      epoch: string;
      date: string;
      sensor: string;
      total_spread_ha: number;
      feature_count: number;
    }>;
    pre_monsoon_mean_ha: number;
    post_monsoon_mean_ha: number;
    seasonal_delta_ha: number;
    seasonal_expansion_pct: number;
    accounting_note: string;
  };
  conservation_analysis: {
    check_dams: number;
    farm_ponds: number;
    percolation_tanks: number;
    total_conservation_structures: number;
  };
  environmental_change_analysis: {
    flags: Array<{
      type: string;
      severity: "high" | "medium" | "low";
      title: string;
      area_ha: number;
      evidence: string;
      observation_date: string;
      recommended_action: string;
    }>;
    methodology: string;
  };
}

export interface DataSourceMetadata {
  id: string;
  publisher: string;
  title: string;
  url: string;
  license: string;
  observation_date: string;
  publication_date: string;
  spatial_resolution: string;
  crs: string;
  geographic_coverage: string;
  attributes_provided: string[];
  known_limitations: string;
}

export interface MultiRegionWaterbodyItem {
  id: string;
  source_id?: string;
  name: string;
  feature_category: FeatureCategory;
  feature_subtype?: string;
  study_area_id: string;
  latitude: number;
  longitude: number;
  area_hectares?: number;
  length_meters?: number;
  state: string;
  district: string;
  village?: string;
  basin?: string;
  watershed?: string;
  sub_watershed?: string;
  source_publisher?: string;
  dataset_name?: string;
  license?: string;
  observation_date?: string;
  import_date?: string;
  verification_status: VerificationStatus;
  inspection_status?: string;
  priority?: string;
  priority_reason?: string;
  is_verified_boundary?: boolean;
  historical_observations?: HistoricalWaterSpreadObservation[];
  coordinates?: any;
}


