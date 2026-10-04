export type TourStep = {
  id: string;
  route: string;
  target: string;
  title: string;
  description: string;
};

export const tourSteps: TourStep[] = [
  {
    id: "dashboard",
    route: "/tour/dashboard",
    target: '[data-tour="metrics"]',
    title: "1 · Welcome to JalRakshak Map Explorer",
    description:
      "Explore representative watershed areas across India. Key indicators and alerts provide a holistic overview of water retention, vegetation health, and field verification tasks.",
  },
  {
    id: "watershed-select",
    route: "/tour/watershed-select",
    target: '[data-tour="watershed-selector"]',
    title: "2 · Select a watershed region",
    description:
      "Filter by State, District, Block, Village, or Watershed boundary. Select a basin such as the Luni River Sub-basin (Barmer) to zoom and fit the map extent to its exact boundary.",
  },
  {
    id: "layer-tree",
    route: "/tour/layers",
    target: '[data-tour="layer-tree"]',
    title: "3 · Toggle thematic GIS layers",
    description:
      "Use the left-side Layer Explorer to turn on Reference Boundaries, Hydrology networks, Water Structures (Check Dams, Farm Ponds), Satellite Indices (NDVI, NDWI), and Field Evidence layers with custom opacity.",
  },
  {
    id: "search",
    route: "/tour/search",
    target: '[data-tour="map-search"]',
    title: "4 · Search for an intervention or site",
    description:
      "Search by Watershed Name, Village, Intervention ID (e.g. barmer, darrang), Water-body name, or Lat/Lng coordinates. Selecting a search result automatically centers and zooms to the site.",
  },
  {
    id: "photo-marker",
    route: "/tour/photo-marker",
    target: '[data-tour="photo-marker"]',
    title: "5 · Inspect field-photo markers",
    description:
      "Click any geo-tagged field-photo pin or intervention marker on the map to open the contextual feature detail panel, inspect EXIF capture timestamps, field notes, and high-res thumbnails.",
  },
  {
    id: "upload",
    route: "/tour/upload",
    target: '[data-tour="upload-drop"]',
    title: "6 · Upload photo & EXIF GPS validation",
    description:
      "Add field photos with automatic EXIF GPS extraction. If GPS metadata is missing, set coordinates manually on the map. Discrepancy checks alert you if a photo is taken far from the intervention.",
  },
  {
    id: "satellite",
    route: "/tour/satellite",
    target: '[data-tour="satellite-workspace"]',
    title: "7 · Satellite analysis & spectral indices",
    description:
      "Inspect Sentinel-2 / Landsat observations. Calculate Vegetation Index (NDVI = (NIR-Red)/(NIR+Red)) and Water Index (NDWI = (Green-NIR)/(Green+NIR)) with scientific color ramp legends.",
  },
  {
    id: "swipe-compare",
    route: "/tour/swipe-compare",
    target: '[data-tour="swipe-compare"]',
    title: "8 · Compare observation dates (Before & After)",
    description:
      "Drag the interactive swipe slider to compare pre-intervention baseline imagery with post-intervention satellite observations. Analyze water spread increase (%) and vegetation recovery within customizable buffers.",
  },
  {
    id: "evidence-quality",
    route: "/tour/evidence",
    target: '[data-tour="evidence-card"]',
    title: "9 · Review explainable evidence quality",
    description:
      "Examine the structured Evidence-Quality Score breakdown (0-100) based on EXIF GPS match, field photo completeness, and satellite scene suitability. Statuses remain distinct from causal environmental impact.",
  },
  {
    id: "reports-export",
    route: "/tour/report",
    target: '[data-tour="reports-export"]',
    title: "10 · Generate reports & export GIS data",
    description:
      "Generate comprehensive PDF watershed reports with map bounds, layer inventory, photo history, and change charts. Export vector layers as GeoJSON or CSV for QGIS / ArcGIS integration.",
  },
];

export function nextTourStep(index: number): number {
  return Math.min(index + 1, tourSteps.length - 1);
}

export function previousTourStep(index: number): number {
  return Math.max(index - 1, 0);
}

export function seededDemoDetections(siteId: string) {
  const seed = Array.from(siteId).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const categories = ["Farm pond", "Check dam", "Plantation", "Contour trench", "Erosion"];
  const category = categories[seed % categories.length];
  return [{ category, confidence: 70 + (seed % 25), source: "DEMO DATA · simulated result" }] as const;
}
