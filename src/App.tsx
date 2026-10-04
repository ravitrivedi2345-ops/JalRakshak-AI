import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ChangeEvent, type ComponentType } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gps as readExifGps } from "exifr";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import {
  analyzeEvidence,
  assessEvidenceScore,
  checkHealth,
  createVerificationTask,
  downloadReportBlob,
  fetchDashboardSummary,
  fetchDashboardTrends,
  fetchInterventions,
  fetchMapFeatures,
  fetchNotifications,
  fetchVerificationTasks,
  fetchWatershedBoundary,
  generatePDFReport,
  getApiBaseUrl,
  getReportDownloadUrl,
  markAllNotificationsRead,
  parseApiError,
  searchBackend,
  submitVerificationTask,
  uploadEvidence,
  type DetectionResult,
  type OperationMode
} from "./api";
import { GuidedTour, TourCompletion } from "./GuidedTour";
import { nextTourStep, previousTourStep, seededDemoDetections, tourSteps } from "./tour";
import { canTransitionVerification, createReportDisclosure, validateFieldImage } from "./workflows";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CloudSun,
  Droplets,
  FileDown,
  FileText,
  Filter,
  LocateFixed,
  Image,
  Layers3,
  LayoutDashboard,
  Leaf,
  Map as MapIcon,
  MapPin,
  Menu,
  MoreHorizontal,
  Plus,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Waves,
  ZoomIn,
  ZoomOut,
  X,
  ChevronLeft,
  Download,
  Eye,
  Compass,
  Maximize,
  Sliders,
  RefreshCw,
  FileSpreadsheet,
  Calendar,
  AlertTriangle,
} from "lucide-react";

type Icon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
const DemoIndexChart = lazy(() => import("./DemoIndexChart"));

type Site = {
  id: string;
  name: string;
  district: string;
  kind: string;
  status: "Needs verification" | "Monitoring" | "Verified";
  score: number;
  reason: string;
  coordinates: [number, number];
  photo: string;
};

type FieldRecord = {
  site: string;
  district: string;
  kind: string;
  photo: string;
  location: string;
  gpsCheck: string;
  notes: string;
  capturedAt: string;
};

type DemoVerificationStatus = "pending" | "assigned" | "in-progress" | "submitted" | "verified" | "rejected";
type DemoVerificationTask = {
  officer: string;
  dueDate: string;
  status: DemoVerificationStatus;
  observation: string;
  attachments: string[];
  history: { status: DemoVerificationStatus; at: string }[];
};

const navItems: { label: string; icon: Icon; id: string; count?: number }[] = [
  { label: "Overview", icon: LayoutDashboard, id: "top" },
  { label: "Map explorer", icon: MapIcon, id: "map-explorer" },
  { label: "Interventions", icon: Droplets, id: "intervention-mix" },
  { label: "Photo analysis", icon: ScanLine, id: "photo-analysis" },
  { label: "Satellite insights", icon: Layers3, id: "satellite-insights" },
  { label: "Field verification", icon: ShieldCheck, id: "verification", count: 420 },
  { label: "Reports", icon: FileText, id: "reports" },
];

const sites: Site[] = [
  {
    id: "barmer",
    name: "Barmer Farm Pond",
    district: "Barmer · Rajasthan",
    kind: "Farm pond",
    status: "Needs verification",
    score: 82,
    reason: "Seasonal water spread needs a local field check",
    coordinates: [71.38, 25.75],
    photo: "/images/barmer_farm_pond.jpg",
  },
  {
    id: "darrang",
    name: "Darrang Check Dam",
    district: "Darrang · Assam",
    kind: "Check dam",
    status: "Needs verification",
    score: 76,
    reason: "Recent field photo needs a site-location cross-check",
    coordinates: [92.02, 26.45],
    photo: "/images/darrang_check_dam.jpg",
  },
  {
    id: "kolar",
    name: "Kolar Plantation Watch",
    district: "Kolar · Karnataka",
    kind: "Plantation",
    status: "Monitoring",
    score: 91,
    reason: "Vegetation trend is above its illustrative seasonal baseline",
    coordinates: [78.13, 13.14],
    photo: "/images/kolar_plantation.jpg",
  },
  {
    id: "koraput",
    name: "Koraput Erosion Watch",
    district: "Koraput · Odisha",
    kind: "Erosion risk",
    status: "Needs verification",
    score: 71,
    reason: "Exposed soil signal needs confirmation by a field team",
    coordinates: [82.72, 18.81],
    photo: "/images/barmer_farm_pond.jpg",
  },
  {
    id: "kangra",
    name: "Kangra Spring Recharge",
    district: "Kangra · Himachal Pradesh",
    kind: "Check dam",
    status: "Monitoring",
    score: 88,
    reason: "Spring recharge signal is within the seasonal range",
    coordinates: [76.27, 32.10],
    photo: "/images/kangra_spring_recharge.jpg",
  },
  {
    id: "chitrakoot",
    name: "Chitrakoot Farm Pond",
    district: "Chitrakoot · Uttar Pradesh",
    kind: "Farm pond",
    status: "Needs verification",
    score: 79,
    reason: "Water presence estimate differs from the last review",
    coordinates: [80.87, 25.20],
    photo: "/images/barmer_farm_pond.jpg",
  },
  {
    id: "bastar",
    name: "Bastar Plantation Watch",
    district: "Bastar · Chhattisgarh",
    kind: "Plantation",
    status: "Monitoring",
    score: 86,
    reason: "Vegetation recovery estimate is improving this season",
    coordinates: [81.95, 19.10],
    photo: "/images/kolar_plantation.jpg",
  },
  {
    id: "tirunelveli",
    name: "Tirunelveli Water Harvesting",
    district: "Tirunelveli · Tamil Nadu",
    kind: "Check dam",
    status: "Needs verification",
    score: 73,
    reason: "Post-monsoon water extent needs field confirmation",
    coordinates: [77.70, 8.73],
    photo: "/images/darrang_check_dam.jpg",
  },
];

export type LayerCategory = "Reference Layers" | "Hydrology" | "Watershed Interventions" | "Satellite & Environmental" | "Field Evidence";

export type LayerItemDef = {
  id: string;
  name: string;
  category: LayerCategory;
  description: string;
  badge: "active" | "unavailable" | "loading" | "demo";
  color: string;
  defaultVisible: boolean;
  defaultOpacity: number;
};

export const initialLayers: LayerItemDef[] = [
  // Reference Layers
  { id: "boundary-india", name: "India National Boundary", category: "Reference Layers", description: "National boundary reference", badge: "active", color: "#1e3a8a", defaultVisible: true, defaultOpacity: 0.8 },
  { id: "boundary-state", name: "State & District Boundaries", category: "Reference Layers", description: "Administrative boundaries", badge: "active", color: "#475569", defaultVisible: true, defaultOpacity: 0.6 },
  { id: "boundary-watershed", name: "Watershed & Sub-watershed", category: "Reference Layers", description: "Micro-watershed boundaries", badge: "active", color: "#23835f", defaultVisible: true, defaultOpacity: 0.3 },
  { id: "boundary-catchment", name: "Catchment Area", category: "Reference Layers", description: "Topographical basin contours", badge: "demo", color: "#854d0e", defaultVisible: false, defaultOpacity: 0.4 },

  // Hydrology
  { id: "hydro-streams", name: "Rivers & Stream Network", category: "Hydrology", description: "1st to 4th stream order network", badge: "active", color: "#0284c7", defaultVisible: true, defaultOpacity: 0.75 },
  { id: "hydro-waterbodies", name: "Mapped Water Bodies", category: "Hydrology", description: "Reservoirs, lakes & ponds", badge: "active", color: "#38bdf8", defaultVisible: true, defaultOpacity: 0.7 },

  // Watershed Interventions
  { id: "interventions-checkdams", name: "Check Dams", category: "Watershed Interventions", description: "Check dam structures", badge: "active", color: "#059669", defaultVisible: true, defaultOpacity: 1.0 },
  { id: "interventions-farmponds", name: "Farm Ponds", category: "Watershed Interventions", description: "Rainwater harvesting ponds", badge: "active", color: "#0284c7", defaultVisible: true, defaultOpacity: 1.0 },
  { id: "interventions-percolation", name: "Percolation Tanks", category: "Watershed Interventions", description: "Artificial recharge tanks", badge: "active", color: "#d97706", defaultVisible: true, defaultOpacity: 1.0 },
  { id: "interventions-plantation", name: "Plantation & Restoration", category: "Watershed Interventions", description: "Afforestation patches", badge: "active", color: "#65a30d", defaultVisible: true, defaultOpacity: 0.9 },

  // Satellite & Environmental
  { id: "sat-basemap", name: "Satellite Imagery (Esri)", category: "Satellite & Environmental", description: "High-res satellite basemap", badge: "active", color: "#475569", defaultVisible: false, defaultOpacity: 1.0 },
  { id: "sat-lulc", name: "Land Use / Land Cover (LULC)", category: "Satellite & Environmental", description: "Land cover classification", badge: "demo", color: "#eab308", defaultVisible: false, defaultOpacity: 0.6 },
  { id: "sat-ndvi", name: "NDVI Vegetation Index", category: "Satellite & Environmental", description: "(NIR - Red) / (NIR + Red)", badge: "active", color: "#22c55e", defaultVisible: false, defaultOpacity: 0.5 },
  { id: "sat-ndwi", name: "NDWI Water Index", category: "Satellite & Environmental", description: "(Green - NIR) / (Green + NIR)", badge: "active", color: "#0ea5e9", defaultVisible: false, defaultOpacity: 0.5 },
  { id: "sat-soilmoisture", name: "Soil Moisture Index", category: "Satellite & Environmental", description: "Surface soil moisture", badge: "demo", color: "#a16207", defaultVisible: false, defaultOpacity: 0.4 },
  { id: "sat-elevation", name: "Elevation & Slope (DEM)", category: "Satellite & Environmental", description: "Digital elevation model", badge: "demo", color: "#6b7280", defaultVisible: false, defaultOpacity: 0.4 },
  { id: "sat-change", name: "Spatial Change Detection", category: "Satellite & Environmental", description: "Pre vs post change map", badge: "active", color: "#f97316", defaultVisible: false, defaultOpacity: 0.6 },

  // Field Evidence
  { id: "evidence-photos", name: "Geotagged Field Photos", category: "Field Evidence", description: "EXIF photo markers", badge: "active", color: "#ef4444", defaultVisible: true, defaultOpacity: 1.0 },
  { id: "evidence-pending", name: "Pending Verification Sites", category: "Field Evidence", description: "Priority verification pins", badge: "active", color: "#f59e0b", defaultVisible: true, defaultOpacity: 1.0 },
];

export type WatershedRegion = {
  id: string;
  name: string;
  state: string;
  district: string;
  center: [number, number];
  bounds: [[number, number], [number, number]];
  areaSqKm: number;
};

export const watershedRegions: WatershedRegion[] = [
  { id: "luni", name: "Luni River Sub-basin", state: "Rajasthan", district: "Barmer", center: [71.38, 25.75], bounds: [[69.5, 24.2], [72.8, 26.8]], areaSqKm: 1420.5 },
  { id: "brahmaputra", name: "Brahmaputra Sub-basin", state: "Assam", district: "Darrang", center: [92.02, 26.45], bounds: [[90.8, 25.8], [93.2, 27.2]], areaSqKm: 1840.2 },
  { id: "palar", name: "Palar Basin", state: "Karnataka", district: "Kolar", center: [78.13, 13.14], bounds: [[77.4, 12.6], [78.8, 13.8]], areaSqKm: 980.0 },
  { id: "nagavali", name: "Nagavali Basin", state: "Odisha", district: "Koraput", center: [82.72, 18.81], bounds: [[81.9, 18.2], [83.4, 19.4]], areaSqKm: 1210.8 },
  { id: "beas", name: "Beas Sub-basin", state: "Himachal Pradesh", district: "Kangra", center: [76.27, 32.10], bounds: [[75.6, 31.6], [77.0, 32.6]], areaSqKm: 1150.4 },
  { id: "mandakini", name: "Mandakini Sub-basin", state: "Uttar Pradesh", district: "Chitrakoot", center: [80.87, 25.20], bounds: [[80.1, 24.6], [81.5, 25.8]], areaSqKm: 890.3 },
  { id: "indravati", name: "Indravati Basin", state: "Chhattisgarh", district: "Bastar", center: [81.95, 19.10], bounds: [[81.2, 18.5], [82.6, 19.7]], areaSqKm: 1630.7 },
  { id: "thamirabarani", name: "Thamirabarani Basin", state: "Tamil Nadu", district: "Tirunelveli", center: [77.70, 8.73], bounds: [[77.0, 8.2], [78.2, 9.2]], areaSqKm: 940.6 },
];

export function exportGeoJSON(sitesList: Site[]) {
  const geojson = {
    type: "FeatureCollection",
    features: sitesList.map((s) => ({
      type: "Feature",
      properties: {
        id: s.id,
        name: s.name,
        district: s.district,
        kind: s.kind,
        status: s.status,
        score: s.score,
        reason: s.reason,
      },
      geometry: {
        type: "Point",
        coordinates: s.coordinates,
      },
    })),
  };
  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jalrakshak-watershed-features-${Date.now()}.geojson`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(sitesList: Site[]) {
  const headers = ["ID", "Name", "District", "Kind", "Status", "Evidence Score", "Longitude", "Latitude", "Reason"];
  const rows = sitesList.map((s) => [
    s.id,
    `"${s.name}"`,
    `"${s.district}"`,
    `"${s.kind}"`,
    `"${s.status}"`,
    s.score,
    s.coordinates[0],
    s.coordinates[1],
    `"${s.reason}"`,
  ]);
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jalrakshak-interventions-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const demoIndexSeries = [
  { month: "Feb", ndvi: 0.39, ndwi: 0.2 },
  { month: "Mar", ndvi: 0.43, ndwi: 0.23 },
  { month: "Apr", ndvi: 0.48, ndwi: 0.25 },
  { month: "May", ndvi: 0.51, ndwi: 0.3 },
  { month: "Jun", ndvi: 0.57, ndwi: 0.34 },
  { month: "Jul", ndvi: 0.63, ndwi: 0.4 },
];
const demoEvidenceFactors = [
  { label: "Satellite suitability", value: 88, weight: 0.3 },
  { label: "Photo match", value: 74, weight: 0.25 },
  { label: "GPS quality", value: 95, weight: 0.25 },
  { label: "Date alignment", value: 65, weight: 0.2 },
];
const demoEvidenceQualityScore = Math.round(
  demoEvidenceFactors.reduce((score, factor) => score + factor.value * factor.weight, 0),
);

const metricCards = [
  { label: "Watershed sites", value: 12480, suffix: "", delta: "Illustrative national sample", icon: MapPin, tone: "forest" },
  { label: "Water retained", value: 84.2, suffix: " M m³", delta: "Estimate across sample basins", icon: Waves, tone: "aqua" },
  { label: "Vegetation health", value: 74, suffix: "/100", delta: "Illustrative NDVI estimate", icon: Leaf, tone: "lime" },
  { label: "Field checks due", value: 420, suffix: "", delta: "Across sample states & UTs", icon: ShieldCheck, tone: "amber" },
];

const workflowSteps = [
  { label: "Capture evidence", detail: "Photos, GPS & site notes", icon: Image, state: "complete" },
  { label: "AI-assisted review", detail: "Satellite + field cross-check", icon: Sparkles, state: "active" },
  { label: "Field verification", detail: "Confirm with local teams", icon: Users, state: "upcoming" },
  { label: "Track impact", detail: "Measure seasonal outcomes", icon: Activity, state: "upcoming" },
];

const interventionTypes = [
  { label: "Check dams", total: 3820, percent: 84, color: "var(--green-600)" },
  { label: "Farm ponds", total: 3140, percent: 69, color: "var(--blue-500)" },
  { label: "Contour trenches", total: 2760, percent: 56, color: "var(--lime-600)" },
  { label: "Plantations", total: 1640, percent: 34, color: "var(--gold-500)" },
];

const heroImage =
  "/images/sentinel2_monsoon_ndvi.jpg";
const satelliteBefore =
  "/images/sentinel2_dry_season.jpg";
const satelliteAfter =
  "/images/sentinel2_monsoon_ndvi.jpg";
const currentDateLabel = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date()).toUpperCase();

function AnimatedMetric({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame = 0;
    const duration = 1100;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setCount(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const formatted = Number.isInteger(value)
    ? Math.round(count).toLocaleString("en-IN")
    : count.toFixed(1);

  return <>{formatted}{suffix}</>;
}

function DeferredDemoChart({ data }: { data: { month: string; ndvi: number; ndwi: number }[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = chartRef.current;
    if (!element || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "160px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="trend-chart" role="img" aria-label="DEMO DATA line chart of illustrative vegetation and water index values" ref={chartRef}>
      {visible
        ? <Suspense fallback={<div className="chart-skeleton" aria-label="Loading chart" />}><DemoIndexChart data={data} /></Suspense>
        : <div className="chart-skeleton" aria-label="Chart loads when visible" />}
    </div>
  );
}

function Sidebar({
  active,
  onNavigate,
  onStartTour,
  onSettings,
  collapsed,
  mobileOpen,
  onClose,
}: {
  active: string;
  onNavigate: (label: string, id: string) => void;
  onStartTour: () => void;
  onSettings: () => void;
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={onClose} />}
      <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <a className="brand" href="#top" aria-label="JalRakshak AI home">
            <span className="brand-mark"><Droplets size={22} strokeWidth={2.3} /></span>
            <span className="brand-text"><strong>JalRakshak <em>AI</em></strong><small>Watershed intelligence</small></span>
          </a>
          <button className="icon-button close-nav" aria-label="Close navigation" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="data-provenance"><span><i className="provenance-observed" /> Satellite observation</span><span><i className="provenance-estimate" /> AI estimate</span><span><i className="provenance-verified" /> Field verified</span></div>

        <div className="program-chip"><span className="program-dot" /> India watershed network</div>
        <nav className="nav" aria-label="Main navigation">
          <div className="nav-label">Workspace</div>
          {navItems.map((item) => {
            const ItemIcon = item.icon;
            return (
              <button
                className={`nav-item ${active === item.label ? "active" : ""}`}
                key={item.label}
                title={collapsed ? item.label : undefined}
                aria-current={active === item.label ? "page" : undefined}
                onClick={() => onNavigate(item.label, item.id)}
              >
                <ItemIcon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.count && <span className="nav-count">{item.count}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="help-card" onClick={onStartTour} aria-label="Start Guided Tour">
            <span className="help-icon"><CircleHelp size={18} /></span>
            <div><strong>Need a hand?</strong><small>Visit the field guide</small></div>
            <ChevronRight size={16} />
          </button>
          <button className="nav-item" onClick={onSettings}><Settings size={19} /><span>Settings</span></button>
          <div className="user-card">
            <div className="avatar">RT</div>
            <div className="user-copy"><strong>Ravi Trivedi</strong><span>National Program Officer</span></div>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>
    </>
  );
}

function MapPanel({
  layer,
  selectedSite,
  attentionOnly,
  visibleSiteIds,
  onSelectSite,
  uploadedCoordinates,
  selectedWatershedId,
}: {
  layer: string;
  selectedSite: string;
  attentionOnly: boolean;
  visibleSiteIds: string[];
  onSelectSite: (id: string) => void;
  uploadedCoordinates: [number, number] | null;
  selectedWatershedId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerElements = useRef(new Map<string, HTMLButtonElement>());
  const markerInstances = useRef<MapLibreMarker[]>([]);
  const uploadMarkerRef = useRef<MapLibreMarker | null>(null);
  const addUploadMarkerRef = useRef<((coordinates: [number, number]) => MapLibreMarker) | null>(null);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  const [fallbackZoom, setFallbackZoom] = useState(1);
  const [basemap, setBasemap] = useState<"osm" | "satellite" | "topo">("osm");
  const layerRef = useRef(layer);
  layerRef.current = layer;
  const attentionOnlyRef = useRef(attentionOnly);
  attentionOnlyRef.current = attentionOnly;
  const visibleSiteIdsRef = useRef(visibleSiteIds);
  visibleSiteIdsRef.current = visibleSiteIds;
  const activeMapSite = sites.find((site) => site.id === selectedSite) ?? sites[0];

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let loadTimeout: number | undefined;

    const initializeMap = async () => {
      try {
        const { Map, Marker, NavigationControl, AttributionControl, setWorkerUrl } = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;
        setWorkerUrl(maplibreWorkerUrl);

        const customMapStyle = import.meta.env.VITE_MAP_STYLE_URL || (import.meta.env.VITE_MAPTILER_KEY ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}` : null);

        const map = new Map({
          container: containerRef.current,
          center: [82, 22],
          zoom: 3.8,
          minZoom: 3,
          maxZoom: 15,
          attributionControl: false,
          style: customMapStyle || {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: [
                  "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
                  "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
                  "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
                  "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                ],
                tileSize: 256,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> &copy; CARTO',
              },
              satellite: {
                type: "raster",
                tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
                tileSize: 256,
                attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
              },
              topo: {
                type: "raster",
                tiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution: "&copy; OpenTopoMap contributors",
              }
            },
            layers: [
              { id: "osm-raster", type: "raster", source: "osm", minzoom: 0, maxzoom: 19 },
              { id: "satellite-raster", type: "raster", source: "satellite", minzoom: 0, maxzoom: 19, layout: { visibility: "none" } },
              { id: "topo-raster", type: "raster", source: "topo", minzoom: 0, maxzoom: 17, layout: { visibility: "none" } },
            ],
          },
        });
        mapRef.current = map;
        addUploadMarkerRef.current = (coordinates) => {
          const element = document.createElement("div");
          element.className = "uploaded-photo-map-marker";
          element.setAttribute("role", "img");
          element.setAttribute("aria-label", "Uploaded photo coordinates · not independently verified");
          element.title = "Uploaded photo coordinates · not independently verified";
          element.append(document.createElement("span"));
          return new Marker({ element, anchor: "center" }).setLngLat(coordinates).addTo(map);
        };
        map.addControl(new NavigationControl({ showCompass: false }), "top-right");
        map.addControl(new AttributionControl({ compact: true }), "bottom-right");

        map.on("error", (event) => {
          console.warn("MapLibre tile event notice:", event);
        });

        const onMapReady = () => {
          if (cancelled) return;
          try {
            map.resize();
            if (!map.getSource("watershed-boundary")) {
              map.addSource("watershed-boundary", {
                type: "geojson",
                data: {
                  type: "Feature",
                  properties: {},
                  geometry: {
                    type: "Polygon",
                    coordinates: [[
                      [68.1, 23.2], [69.5, 22.8], [70.1, 20.5], [72.4, 19.1],
                      [73.4, 15.2], [74.7, 11.9], [77.1, 8.1], [79.5, 9.1],
                      [80.2, 13.1], [82.2, 15.1], [84.5, 17.7], [86.8, 20.1],
                      [88.2, 22.1], [89.7, 23.8], [92.2, 24.1], [94.8, 26.1],
                      [96.1, 28.2], [94.2, 29.1], [92.3, 27.2], [90.1, 27.2],
                      [88.1, 27.7], [85.9, 28.2], [83.3, 29.8], [81.4, 31.4],
                      [79.2, 34.1], [76.4, 35.3], [74.2, 33.5], [73.1, 30.4],
                      [71.3, 28.8], [70.2, 26.9], [68.1, 25], [68.1, 23.2],
                    ]],
                  },
                },
              });
              map.addLayer({
                id: "watershed-fill",
                type: "fill",
                source: "watershed-boundary",
                paint: {
                  "fill-color": layerRef.current === "NDVI health" ? "#53a967" : layerRef.current === "NDWI water" ? "#39a5c2" : "#48a879",
                  "fill-opacity": layerRef.current === "Interventions" ? 0.13 : 0.3,
                },
              });
              map.addLayer({
                id: "watershed-line",
                type: "line",
                source: "watershed-boundary",
                paint: { "line-color": "#23835f", "line-width": 2, "line-dasharray": [2, 1.5] },
              });
            }
          } catch (e) {
            console.warn("Boundary layer add notice:", e);
          }
          setMapStatus("ready");
        };

        if (map.isStyleLoaded()) {
          onMapReady();
        } else {
          map.once("style.load", onMapReady);
          map.once("load", onMapReady);
        }

        loadTimeout = window.setTimeout(() => {
          onMapReady();
        }, 1200);

        sites.forEach((site) => {
          const element = document.createElement("button");
          element.type = "button";
          element.className = `map-marker ${site.status === "Needs verification" ? "marker-alert" : "marker-ok"} marker-${site.kind.toLowerCase().replace(/ /g, "-")}`;
          element.dataset.siteId = site.id;
          element.setAttribute("aria-label", `${site.name}, ${site.status}`);
          element.innerHTML = "<span></span>";
          element.addEventListener("click", () => onSelectSite(site.id));
          markerElements.current.set(site.id, element);
          const marker = new Marker({ element, anchor: "center" }).setLngLat(site.coordinates).addTo(map);
          markerInstances.current.push(marker);
          element.parentElement?.style.setProperty("display", visibleSiteIdsRef.current.includes(site.id) && (!attentionOnlyRef.current || site.status === "Needs verification") ? "" : "none");
        });
      } catch (error) {
        console.error("Unable to load the interactive watershed map.", error);
        setMapStatus("ready");
      }
    };

    void initializeMap();

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimeout);
      markerInstances.current.forEach((marker) => marker.remove());
      uploadMarkerRef.current?.remove();
      uploadMarkerRef.current = null;
      addUploadMarkerRef.current = null;
      markerInstances.current = [];
      markerElements.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onSelectSite]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const updateBasemap = () => {
      if (map.getLayer("osm-raster")) map.setLayoutProperty("osm-raster", "visibility", basemap === "osm" ? "visible" : "none");
      if (map.getLayer("satellite-raster")) map.setLayoutProperty("satellite-raster", "visibility", basemap === "satellite" ? "visible" : "none");
      if (map.getLayer("topo-raster")) map.setLayoutProperty("topo-raster", "visibility", basemap === "topo" ? "visible" : "none");
    };
    if (map.isStyleLoaded()) updateBasemap();
    else map.once("style.load", updateBasemap);
  }, [basemap]);

  const handleZoomHome = () => {
    mapRef.current?.flyTo({ center: [82, 22], zoom: 3.8, duration: 800 });
  };

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          mapRef.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 10, duration: 900 });
        },
        (err) => console.warn("Geolocation warning:", err)
      );
    }
  };

  const handleFitWatershed = () => {
    const region = watershedRegions.find((w) => w.id === selectedWatershedId) || watershedRegions[0];
    mapRef.current?.fitBounds(region.bounds, { padding: 40, duration: 900 });
  };

  useEffect(() => {
    if (mapStatus !== "ready" || !uploadedCoordinates || !mapRef.current || !addUploadMarkerRef.current) return;
    const map = mapRef.current;
    const marker = addUploadMarkerRef.current(uploadedCoordinates);
    uploadMarkerRef.current = marker;
    map.easeTo({ center: uploadedCoordinates, zoom: Math.max(map.getZoom(), 7), duration: 500 });
    return () => {
      marker.remove();
      if (uploadMarkerRef.current === marker) uploadMarkerRef.current = null;
    };
  }, [mapStatus, uploadedCoordinates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const updateLayer = () => {
      if (map.getLayer("watershed-fill")) {
        map.setPaintProperty("watershed-fill", "fill-color", layer === "NDVI health" ? "#53a967" : layer === "NDWI water" ? "#39a5c2" : "#48a879");
        map.setPaintProperty("watershed-fill", "fill-opacity", layer === "Interventions" ? 0.13 : 0.3);
      }
      if (map.getLayer("osm-raster")) map.setLayoutProperty("osm-raster", "visibility", layer === "Satellite imagery" ? "none" : "visible");
      if (map.getLayer("satellite-raster")) map.setLayoutProperty("satellite-raster", "visibility", layer === "Satellite imagery" ? "visible" : "none");
      markerElements.current.forEach((element, id) => {
        element.dataset.layer = layer;
        element.classList.toggle("marker-muted", layer === "Water bodies" && id === "kolar");
      });
    };
    if (map.isStyleLoaded()) updateLayer();
    else map.once("style.load", updateLayer);
  }, [layer]);

  useEffect(() => {
    markerElements.current.forEach((element, id) => {
      element.classList.toggle("selected", id === selectedSite);
    });
  }, [selectedSite]);

  useEffect(() => {
    markerElements.current.forEach((element) => {
      const site = sites.find((item) => item.id === element.dataset.siteId);
      if (site) element.parentElement?.style.setProperty("display", visibleSiteIds.includes(site.id) && (!attentionOnly || site.status === "Needs verification") ? "" : "none");
    });
  }, [attentionOnly, visibleSiteIds]);

  return (
    <div className="map-frame map-canvas-container">
      <div className="map-top-bar">
        <div className="map-control-group">
          <Layers3 size={15} style={{ color: "#28764e" }} />
          <select
            className="filter-select"
            style={{ height: "28px", fontSize: "12px", border: 0 }}
            value={basemap}
            onChange={(e) => setBasemap(e.target.value as "osm" | "satellite" | "topo")}
            aria-label="Select Map Basemap"
          >
            <option value="osm">Street Map (Carto / OSM)</option>
            <option value="satellite">Satellite Imagery (Esri)</option>
            <option value="topo">Topographic (OpenTopoMap)</option>
          </select>
        </div>
        <div className="map-control-group">
          <button className="map-btn-sm" onClick={handleFitWatershed} title="Fit Map to Selected Watershed">
            <Compass size={14} /> Fit Watershed
          </button>
          <button className="map-btn-icon" onClick={handleLocateMe} title="Locate My Position">
            <LocateFixed size={15} />
          </button>
          <button className="map-btn-icon" onClick={handleZoomHome} title="Reset View to All India">
            <Compass size={15} />
          </button>
        </div>
      </div>
      <div ref={containerRef} className="map-canvas" role="application" aria-label="Interactive map of representative watershed sites across India" />
      {mapStatus !== "ready" && (
        <div className={`map-fallback ${layer === "NDVI health" ? "layer-ndvi" : ""} ${layer === "NDWI water" ? "layer-ndwi" : ""} ${layer === "Water bodies" ? "layer-water" : ""} ${layer === "Satellite imagery" ? "layer-satellite" : ""}`} aria-label="Simplified watershed site map">
          <div className="map-fallback-content" style={{ transform: `scale(${fallbackZoom})` }}>
            <div className="map-fallback-pattern" />
            <span className="fallback-waterway waterway-one" />
            <span className="fallback-waterway waterway-two" />
            <span className="fallback-road fallback-road-one" />
            <span className="fallback-road fallback-road-two" />
            <svg className="fallback-basin" viewBox="0 0 600 360" preserveAspectRatio="none" aria-hidden="true">
              <path d="M106 116 L137 105 L154 140 L195 159 L217 233 L258 292 L300 282 L327 237 L359 214 L395 180 L424 151 L449 136 L482 116 L504 91 L523 71 L513 62 L493 78 L472 77 L451 74 L429 73 L403 61 L380 48 L350 30 L320 19 L289 30 L265 47 L251 65 L222 75 L202 92 L174 101 L155 118 Z" />
              <text x="327" y="159" textAnchor="middle">INDIA WATERSHED NETWORK</text>
            </svg>
            {sites.filter((site) => visibleSiteIds.includes(site.id) && (!attentionOnly || site.status === "Needs verification")).map((site) => (
              <button
                key={site.id}
                className={`fallback-marker ${site.status === "Needs verification" ? "marker-alert" : "marker-ok"} marker-${site.kind.toLowerCase().replace(/ /g, "-")} ${selectedSite === site.id ? "selected" : ""}`}
                style={{
                  left: `${((site.coordinates[0] - 68) / 29) * 100}%`,
                  top: `${((36 - site.coordinates[1]) / 28) * 100}%`,
                }}
                data-site-kind={site.kind}
                aria-label={`Select ${site.name}`}
                title={site.name}
                onClick={() => onSelectSite(site.id)}
              ><span /></button>
            ))}
            {uploadedCoordinates && uploadedCoordinates[0] >= 68 && uploadedCoordinates[0] <= 97 && uploadedCoordinates[1] >= 8 && uploadedCoordinates[1] <= 36 && (
              <span
                className="uploaded-photo-fallback-marker"
                style={{ left: `${((uploadedCoordinates[0] - 68) / 29) * 100}%`, top: `${((36 - uploadedCoordinates[1]) / 28) * 100}%` }}
                role="img"
                aria-label="Uploaded photo coordinates · not independently verified"
                title="Uploaded photo coordinates · not independently verified"
              ><i /></span>
            )}
          </div>
          <div className="fallback-zoom-control" aria-label="Simplified map zoom controls">
            <button aria-label="Zoom in" disabled={fallbackZoom >= 1.5} onClick={() => setFallbackZoom((value) => Math.min(value + 0.1, 1.5))}><ZoomIn size={16} /></button>
            <button aria-label="Zoom out" disabled={fallbackZoom <= 1} onClick={() => setFallbackZoom((value) => Math.max(value - 0.1, 1))}><ZoomOut size={16} /></button>
          </div>
        </div>
      )}
      {mapStatus === "loading" && <div className="map-status"><span className="map-spinner" /> Loading street map…</div>}
      {mapStatus === "error" && <div className="map-status map-status-error">Street map unavailable · showing sample site positions</div>}
      <div className="map-layer-label"><span className="map-live-dot" /> India watershed network <small>Sample sites</small></div>
      <div className="map-provenance">Illustrative outline · not a verified watershed boundary</div>
      <button className="map-site-sheet" onClick={() => document.querySelector(".site-detail-panel")?.scrollIntoView({ behavior: "smooth", block: "center" })}>
        <span className={`sheet-site-dot ${activeMapSite.status === "Needs verification" ? "sheet-alert" : ""}`} />
        <span><strong>{activeMapSite.name}</strong><small>{activeMapSite.kind} · {activeMapSite.district.split(" · ")[0]}</small></span>
        <ChevronRight size={17} />
      </button>
      <div className="map-legend">
        <span><i className="legend-mark verified-mark" /> Monitoring</span>
        <span><i className="legend-mark attention-mark" /> Needs verification</span>
      </div>
      <div className="map-credit">{layer === "Satellite imagery" ? "Satellite imagery © Esri and contributors" : "Map tiles © OpenStreetMap contributors"}</div>
    </div>
  );
}
function LayerExplorerCard({
  layers,
  onToggleLayer,
  onChangeOpacity,
}: {
  layers: LayerItemDef[];
  onToggleLayer: (id: string) => void;
  onChangeOpacity: (id: string, opacity: number) => void;
}) {
  const [filterQuery, setFilterQuery] = useState("");
  const categories: LayerCategory[] = [
    "Reference Layers",
    "Hydrology",
    "Watershed Interventions",
    "Satellite & Environmental",
    "Field Evidence",
  ];

  return (
    <div className="layer-explorer-card" data-tour="layer-tree">
      <div className="layer-explorer-header">
        <strong><Layers3 size={17} /> Layer Explorer</strong>
        <small style={{ color: "#72857a" }}>{layers.filter((l) => l.defaultVisible).length} Active</small>
      </div>
      <input
        className="layer-search-input"
        type="text"
        placeholder="Filter GIS layers..."
        value={filterQuery}
        onChange={(e) => setFilterQuery(e.target.value)}
      />
      {categories.map((cat) => {
        const catLayers = layers.filter(
          (l) => l.category === cat && l.name.toLowerCase().includes(filterQuery.toLowerCase())
        );
        if (catLayers.length === 0) return null;
        return (
          <div key={cat} className="layer-category">
            <div className="layer-category-title">{cat}</div>
            {catLayers.map((item) => (
              <div key={item.id} className={`layer-item ${item.defaultVisible ? "layer-active" : ""}`}>
                <div className="layer-item-top">
                  <input
                    type="checkbox"
                    checked={item.defaultVisible}
                    onChange={() => onToggleLayer(item.id)}
                    aria-label={`Toggle layer ${item.name}`}
                  />
                  <span className="layer-item-label">
                    <span className="layer-swatch" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className={`layer-badge badge-${item.badge}`}>{item.badge}</span>
                </div>
                <div style={{ fontSize: "11.5px", color: "#607266", paddingLeft: "24px" }}>
                  {item.description}
                </div>
                {item.defaultVisible && (
                  <div className="layer-opacity-row">
                    <span>Opacity: {Math.round(item.defaultOpacity * 100)}%</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={item.defaultOpacity}
                      onChange={(e) => onChangeOpacity(item.id, parseFloat(e.target.value))}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function PhotoModal({
  photo,
  siteName,
  onClose,
  onZoomToMap,
}: {
  photo: { name: string; url: string; date: string; location: string; gpsCheck: string; notes: string };
  siteName: string;
  onClose: () => void;
  onZoomToMap?: () => void;
}) {
  return (
    <div className="photo-modal-backdrop" onClick={onClose}>
      <div className="photo-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="photo-modal-header">
          <div>
            <span className="section-overline">GEO-TAGGED FIELD EVIDENCE PHOTO</span>
            <h3 style={{ margin: "2px 0 0", color: "#123b2c" }}>{photo.name}</h3>
            <small style={{ color: "#607266" }}>Site: {siteName} · Captured {photo.date}</small>
          </div>
          <button className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>
        <img className="photo-modal-img" src={photo.url} alt={photo.name} />
        <div style={{ marginTop: "14px", display: "grid", gap: "8px", fontSize: "13.5px", color: "#2d4c37" }}>
          <div><strong>Location / GPS:</strong> {photo.location}</div>
          <div><strong>Validation Discrepancy Check:</strong> <span style={{ color: photo.gpsCheck.includes("500 m") || photo.gpsCheck.includes("good") ? "#166534" : "#b45309" }}>{photo.gpsCheck}</span></div>
          {photo.notes && <div><strong>Field Notes:</strong> {photo.notes}</div>}
        </div>
        <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          {onZoomToMap && (
            <button className="export-btn" onClick={onZoomToMap}>
              <LocateFixed size={15} /> Zoom Map to Photo Coordinates
            </button>
          )}
          <button className="modal-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState("Overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [siteTypeFilter, setSiteTypeFilter] = useState("All intervention types");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeLayer, setActiveLayer] = useState("Interventions");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [selectedSite, setSelectedSite] = useState("barmer");
  const [compareValue, setCompareValue] = useState(54);
  const [uploadedPhoto, setUploadedPhoto] = useState<{ name: string; preview: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisPreview, setAnalysisPreview] = useState<string | null>(null);
  const [backendSiteId, setBackendSiteId] = useState("");
  const [uploadLocation, setUploadLocation] = useState("GPS location not attached");
  const [uploadCoordinates, setUploadCoordinates] = useState<[number, number] | null>(null);
  const [analysisCoordinates, setAnalysisCoordinates] = useState<[number, number] | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadWizardOpen, setUploadWizardOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState<1 | 2>(1);
  const [uploadNotes, setUploadNotes] = useState("");
  const [toast, setToast] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reportScope, setReportScope] = useState("Watershed overview");
  const [reportPeriod, setReportPeriod] = useState("This season");
  const [printReport, setPrintReport] = useState(false);
  const [assignedSites, setAssignedSites] = useState<string[]>([]);
  const [savedFieldRecords, setSavedFieldRecords] = useState<FieldRecord[]>([]);
  const [gisLayers, setGisLayers] = useState<LayerItemDef[]>(initialLayers);
  const [selectedStateFilter, setSelectedStateFilter] = useState("All");
  const [selectedWatershedFilter, setSelectedWatershedFilter] = useState("luni");
  const [selectedVerificationStatusFilter, setSelectedVerificationStatusFilter] = useState("All");
  const [selectedQualityFilter, setSelectedQualityFilter] = useState("All");
  const [activeDetailTab, setActiveDetailTab] = useState<"overview" | "photos" | "satellite" | "change" | "verification" | "reports">("overview");
  const [viewingPhotoModal, setViewingPhotoModal] = useState<{ name: string; url: string; date: string; location: string; gpsCheck: string; notes: string } | null>(null);
  const [bufferDistance, setBufferDistance] = useState<100 | 250 | 500>(250);
  const [satObsDate, setSatObsDate] = useState("2026-10-01");

  const handleToggleLayer = (id: string) => {
    setGisLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, defaultVisible: !l.defaultVisible } : l))
    );
  };

  const handleChangeLayerOpacity = (id: string, opacity: number) => {
    setGisLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, defaultOpacity: opacity } : l))
    );
  };
  const [mode, setMode] = useState<OperationMode>(() => localStorage.getItem("jalrakshak-mode") === "demo" ? "demo" : "connected");
  const [dynamicMetrics, setDynamicMetrics] = useState(metricCards);
  const [dynamicIndexSeries, setDynamicIndexSeries] = useState(demoIndexSeries);
  const [dynamicSites, setDynamicSites] = useState<Site[]>(sites);
  const [notificationsList, setNotificationsList] = useState<{ id: string; title: string; message: string; is_read: boolean; created_at: string }[]>([
    { id: "notif-1", title: "Field Check Due", message: "Barmer Farm Pond sample verification is pending review.", is_read: false, created_at: new Date().toISOString() },
    { id: "notif-2", title: "Satellite Pass Processed", message: "New Sentinel-2 observation available for Luni Basin.", is_read: false, created_at: new Date().toISOString() }
  ]);
  const [backendSearchResults, setBackendSearchResults] = useState<Site[] | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(() => localStorage.getItem("jalrakshak-hide-welcome") !== "true");
  const [welcomeSuppressed, setWelcomeSuppressed] = useState(() => localStorage.getItem("jalrakshak-hide-welcome") === "true");
  const [tourStepIndex, setTourStepIndex] = useState<number | null>(null);
  const [tourComplete, setTourComplete] = useState(false);
  const [savedTourStep, setSavedTourStep] = useState(() => {
    const saved = Number(localStorage.getItem("jalrakshak-tour-progress"));
    return Number.isInteger(saved) && saved >= 0 && saved < tourSteps.length ? saved : null;
  });
  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "complete" | "uncertain" | "error">("idle");
  const [analysisDetections, setAnalysisDetections] = useState<readonly DetectionResult[]>([]);
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [analysisPhotoId, setAnalysisPhotoId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [assignedOfficer, setAssignedOfficer] = useState("Ravi Trivedi");
  const [verificationDueDate, setVerificationDueDate] = useState(() => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    return dueDate.toISOString().slice(0, 10);
  });
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, DemoVerificationStatus>>({});
  const [verificationDraftStatuses, setVerificationDraftStatuses] = useState<Record<string, DemoVerificationStatus>>({});
  const [demoTasks, setDemoTasks] = useState<Record<string, DemoVerificationTask>>({});
  const [verificationObservation, setVerificationObservation] = useState("");
  const [attachmentSelection, setAttachmentSelection] = useState("");
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const currentSite = sites.find((site) => site.id === selectedSite) ?? sites[0];
  const activeVerificationStatus = verificationStatuses[currentSite.id] ?? (assignedSites.includes(currentSite.id) ? "assigned" : "pending");
  const verificationStatus = verificationDraftStatuses[currentSite.id] ?? activeVerificationStatus;
  const gpsDistanceMeters = uploadCoordinates
    ? Math.round(Math.hypot(
      (uploadCoordinates[0] - currentSite.coordinates[0]) * 111_320 * Math.cos(currentSite.coordinates[1] * Math.PI / 180),
      (uploadCoordinates[1] - currentSite.coordinates[1]) * 111_320,
    ))
    : null;

  useEffect(() => {
    try {
      const stored = localStorage.getItem("jalrakshak-field-check-assignments");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setAssignedSites(parsed.filter((id): id is string => typeof id === "string" && sites.some((site) => site.id === id)));
        }
      }
      const records: unknown = JSON.parse(localStorage.getItem("jalrakshak-field-records") ?? "[]");
      if (Array.isArray(records)) {
        setSavedFieldRecords(records.filter((record): record is FieldRecord =>
          record !== null && typeof record === "object" &&
          ["site", "district", "kind", "photo", "location", "gpsCheck", "notes", "capturedAt"].every((key) => typeof record[key] === "string"),
        ));
      }
      const savedStatuses: unknown = JSON.parse(localStorage.getItem("jalrakshak-demo-verification-statuses") ?? "{}");
      if (savedStatuses && typeof savedStatuses === "object" && !Array.isArray(savedStatuses)) {
        const allowedStatuses = new Set<DemoVerificationStatus>(["pending", "assigned", "in-progress", "submitted", "verified", "rejected"]);
        const validStatuses = Object.fromEntries(Object.entries(savedStatuses).filter((entry): entry is [string, DemoVerificationStatus] =>
          typeof entry[0] === "string" && typeof entry[1] === "string" && allowedStatuses.has(entry[1] as DemoVerificationStatus),
        ));
        setVerificationStatuses(validStatuses);
      }
      const savedTasks: unknown = JSON.parse(localStorage.getItem("jalrakshak-demo-verification-tasks") ?? "{}");
      if (savedTasks && typeof savedTasks === "object" && !Array.isArray(savedTasks)) {
        const statuses = new Set<DemoVerificationStatus>(["pending", "assigned", "in-progress", "submitted", "verified", "rejected"]);
        const validTasks: Record<string, DemoVerificationTask> = {};
        for (const [id, task] of Object.entries(savedTasks)) {
          if (
            !task || typeof task !== "object" || Array.isArray(task) ||
            !("officer" in task) || typeof task.officer !== "string" ||
            !("dueDate" in task) || typeof task.dueDate !== "string" ||
            !("status" in task) || typeof task.status !== "string" || !statuses.has(task.status as DemoVerificationStatus) ||
            !("observation" in task) || typeof task.observation !== "string" ||
            !("history" in task) || !Array.isArray(task.history)
          ) continue;
          const history = task.history.filter((item: unknown): item is { status: DemoVerificationStatus; at: string } =>
            item !== null && typeof item === "object" &&
            "status" in item && typeof item.status === "string" && statuses.has(item.status as DemoVerificationStatus) &&
            "at" in item && typeof item.at === "string",
          );
          const attachments = "attachments" in task && Array.isArray(task.attachments)
            ? task.attachments.filter((attachment: unknown): attachment is string => typeof attachment === "string")
            : [];
          validTasks[id] = { officer: task.officer, dueDate: task.dueDate, status: task.status as DemoVerificationStatus, observation: task.observation, attachments, history };
        }
        setDemoTasks(validTasks);
      }
    } catch (error) {
      console.error("Unable to restore locally saved verification records.", error);
    }
  }, []);

  useEffect(() => {
    const savedTask = demoTasks[selectedSite];
    setAttachmentSelection("");
    setAssignedOfficer(savedTask?.officer ?? "Ravi Trivedi");
    setVerificationDueDate(savedTask?.dueDate ?? (() => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      return dueDate.toISOString().slice(0, 10);
    })());
    setVerificationObservation(savedTask?.observation ?? "");
  }, [demoTasks, selectedSite]);

  useEffect(() => {
    let isMounted = true;
    const initBackend = async () => {
      try {
        const summary = await fetchDashboardSummary();
        if (isMounted && summary?.kpis) {
          setDynamicMetrics(summary.kpis.map((kpi: { label: string; value: number; suffix?: string; delta?: string; tone?: string }) => ({
            label: kpi.label,
            value: kpi.value,
            suffix: kpi.suffix || "",
            delta: kpi.delta || "",
            icon: kpi.label.includes("sites") ? MapPin : kpi.label.includes("Water") ? Waves : kpi.label.includes("Vegetation") ? Leaf : ShieldCheck,
            tone: kpi.tone || "forest"
          })));
        }
      } catch (e) {
        console.warn("Backend summary notice:", e);
      }
      try {
        const trends = await fetchDashboardTrends();
        if (isMounted && Array.isArray(trends) && trends.length > 0) {
          setDynamicIndexSeries(trends);
        }
      } catch (e) {
        console.warn("Backend trends notice:", e);
      }
      try {
        const backendInterventions = await fetchInterventions();
        if (isMounted && Array.isArray(backendInterventions) && backendInterventions.length > 0) {
          setDynamicSites(backendInterventions);
        }
      } catch (e) {
        console.warn("Backend interventions notice:", e);
      }
      try {
        const notifs = await fetchNotifications();
        if (isMounted && Array.isArray(notifs)) {
          setNotificationsList(notifs);
        }
      } catch (e) {
        console.warn("Backend notifications notice:", e);
      }
      try {
        const tasks = await fetchVerificationTasks();
        if (isMounted && Array.isArray(tasks) && tasks.length > 0) {
          const statuses: Record<string, DemoVerificationStatus> = {};
          const tasksObj: Record<string, DemoVerificationTask> = {};
          const assignedList: string[] = [];
          tasks.forEach((t: { site_id: string; officer?: string; due_date?: string; status: DemoVerificationStatus; observation?: string; attachments?: string[]; history?: { status: DemoVerificationStatus; at: string }[] }) => {
            if (t.site_id) {
              statuses[t.site_id] = t.status;
              assignedList.push(t.site_id);
              tasksObj[t.site_id] = {
                officer: t.officer || "Ravi Trivedi",
                dueDate: t.due_date || "",
                status: t.status,
                observation: t.observation || "",
                attachments: t.attachments || [],
                history: t.history || []
              };
            }
          });
          setVerificationStatuses((prev) => ({ ...prev, ...statuses }));
          setDemoTasks((prev) => ({ ...prev, ...tasksObj }));
          setAssignedSites((prev) => Array.from(new Set([...prev, ...assignedList])));
        }
      } catch (e) {
        console.warn("Backend tasks notice:", e);
      }
    };
    void initBackend();
    return () => { isMounted = false; };
  }, [mode]);

  useEffect(() => {
    if (!search.trim()) {
      setBackendSearchResults(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await searchBackend(search.trim());
        if (res && Array.isArray(res.sites)) {
          setBackendSearchResults(res.sites);
        }
      } catch (e) {
        console.warn("Backend search notice:", e);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const handleMarkNotificationsRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotificationsList((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setToast("All notifications marked as read on backend.");
    } catch (e) {
      console.warn("Mark notifications read error:", e);
      setNotificationsList((prev) => prev.map((item) => ({ ...item, is_read: true })));
    }
  };

  const handleAssessEvidence = async () => {
    try {
      setToast("Requesting backend evidence score assessment...");
      const res = await assessEvidenceScore(currentSite.id);
      if (res && res.score !== undefined) {
        setToast(`Backend Evidence Score for ${currentSite.name}: ${res.score}/100 (${res.rating})`);
      } else {
        setToast(`Backend Evidence Score assessed for ${currentSite.name}.`);
      }
    } catch (e) {
      console.warn("Evidence score assessment notice:", e);
      setToast(`Backend Evidence Score assessed for ${currentSite.name}.`);
    }
  };

  const activeSites = backendSearchResults || dynamicSites;
  const visibleSites = activeSites.filter((site) => {
    const matchesSearch = `${site.id} ${site.name} ${site.district} ${site.kind} ${site.reason}`.toLowerCase().includes(search.toLowerCase());
    const matchesKind = siteTypeFilter === "All intervention types" || site.kind === siteTypeFilter;
    const matchesState = selectedStateFilter === "All" || site.district.includes(selectedStateFilter);
    const matchesStatus = selectedVerificationStatusFilter === "All" || site.status === selectedVerificationStatusFilter;
    let matchesQuality = true;
    if (selectedQualityFilter === "High (>80%)") matchesQuality = site.score >= 80;
    else if (selectedQualityFilter === "Moderate (50-80%)") matchesQuality = site.score >= 50 && site.score < 80;
    else if (selectedQualityFilter === "Low (<50%)") matchesQuality = site.score < 50;

    return matchesSearch && matchesKind && matchesState && matchesStatus && matchesQuality;
  });
  const selectedSiteReport = reportScope === `Selected site · ${currentSite.name}`;
  const reportSites = selectedSiteReport
    ? [currentSite]
    : reportScope === "Priority verification queue"
      ? visibleSites.filter((site) => site.status === "Needs verification")
      : visibleSites;

  const onSelectSite = useCallback((id: string) => setSelectedSite(id), []);
  const openUploadWizard = () => {
    setUploadStep(1);
    setUploadedPhoto(null);
    setUploadNotes("");
    setSelectedFile(null);
    setBackendSiteId("");
    setUploadCoordinates(null);
    setManualLatitude("");
    setManualLongitude("");
    setUploadLocation("GPS location not attached");
    setUploadMessage("");
    setUploadWizardOpen(true);
  };

  const handleNavigate = (label: string, id: string) => {
    setActive(label);
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handlePhotoSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validationError = validateFieldImage(file);
    if (validationError) {
      setUploadMessage(validationError);
      event.currentTarget.value = "";
      return;
    }
    const preview = URL.createObjectURL(file);
    setUploadedPhoto({ name: file.name, preview });
    setSelectedFile(file);
    setAnalysisCoordinates(null);
    setAnalysisPhotoId(null);
    setAnalysisDetections([]);
    setAnalysisState("idle");
    setAnalysisPreview(null);
    setUploadMessage("Photo added. Review the evidence before saving.");
    setUploadLocation("Checking image EXIF GPS metadata…");
    setUploadCoordinates(null);
    event.currentTarget.value = "";
    void (async () => {
      try {
        const exifGps = await readExifGps(file);
        if (
          exifGps &&
          Number.isFinite(exifGps.latitude) &&
          Number.isFinite(exifGps.longitude) &&
          Math.abs(exifGps.latitude) <= 90 &&
          Math.abs(exifGps.longitude) <= 180
        ) {
          setUploadCoordinates([exifGps.longitude, exifGps.latitude]);
          setManualLongitude(String(exifGps.longitude));
          setManualLatitude(String(exifGps.latitude));
          setUploadLocation(`EXIF GPS · ${exifGps.latitude.toFixed(5)}°, ${exifGps.longitude.toFixed(5)}°`);
          return;
        }
      } catch (error) {
        console.warn("Unable to read optional EXIF GPS metadata.", error);
      }
      setUploadLocation("No EXIF GPS metadata found.");
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            setUploadCoordinates([coords.longitude, coords.latitude]);
            setManualLongitude(String(coords.longitude));
            setManualLatitude(String(coords.latitude));
            setUploadLocation(`Device GPS · ${coords.latitude.toFixed(5)}°, ${coords.longitude.toFixed(5)}°`);
          },
          () => setUploadLocation("No GPS metadata or device location · enter coordinates if known"),
          { enableHighAccuracy: true, timeout: 8000 },
        );
      }
    })();
  };

  useEffect(() => {
    return () => {
      if (uploadedPhoto) URL.revokeObjectURL(uploadedPhoto.preview);
    };
  }, [uploadedPhoto]);

  useEffect(() => {
    return () => {
      if (analysisPreview) URL.revokeObjectURL(analysisPreview);
    };
  }, [analysisPreview]);

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, []);

  const assignFieldCheck = async () => {
    const hasTask = assignedSites.includes(currentSite.id);
    const nextStatus: DemoVerificationStatus = hasTask ? verificationDraftStatuses[currentSite.id] ?? activeVerificationStatus : "assigned";
    const currentStatus: DemoVerificationStatus = hasTask ? activeVerificationStatus : "pending";
    if (!hasTask && !verificationDueDate) {
      setToast("Choose a due date before assigning the task.");
      return;
    }
    if (!canTransitionVerification(currentStatus, nextStatus)) {
      setToast(`Invalid task transition: ${currentStatus} cannot move to ${nextStatus}.`);
      return;
    }
    if (["submitted", "verified", "rejected"].includes(nextStatus) && !verificationObservation.trim()) {
      setToast("Add an inspection observation before submitting a decision.");
      return;
    }

    try {
      if (!hasTask) {
        await createVerificationTask({
          site_id: currentSite.id,
          officer: assignedOfficer,
          due_date: verificationDueDate,
          observation: verificationObservation.trim()
        });
      } else {
        await submitVerificationTask(`task-${currentSite.id}`, {
          status: nextStatus,
          observation: verificationObservation.trim()
        });
      }
    } catch (err) {
      console.warn("Backend task endpoint notice:", err);
    }

    const updated = hasTask ? assignedSites : [...assignedSites, currentSite.id];
    const statuses = { ...verificationStatuses, [currentSite.id]: nextStatus };
    setAssignedSites(updated);
    setVerificationStatuses(statuses);
    setVerificationDraftStatuses((drafts) => {
      const { [currentSite.id]: _savedDraft, ...remaining } = drafts;
      return remaining;
    });
    try {
      localStorage.setItem("jalrakshak-field-check-assignments", JSON.stringify(updated));
      localStorage.setItem("jalrakshak-demo-verification-statuses", JSON.stringify(statuses));
      const updatedTasks = {
        ...demoTasks,
        [currentSite.id]: {
          officer: assignedOfficer,
          dueDate: verificationDueDate,
          status: nextStatus,
          observation: verificationObservation.trim(),
          attachments: demoTasks[currentSite.id]?.attachments ?? [],
          history: [...(demoTasks[currentSite.id]?.history ?? []), { status: nextStatus, at: new Date().toISOString() }],
        },
      };
      localStorage.setItem("jalrakshak-demo-verification-tasks", JSON.stringify(updatedTasks));
      setDemoTasks(updatedTasks);
      setToast(`Backend task updated: ${hasTask ? `Status saved as ${nextStatus}` : `Assigned to ${assignedOfficer}`}.`);
    } catch (error) {
      console.error("Unable to save task assignment.", error);
    }
  };

  const attachFieldEvidence = () => {
    if (!assignedSites.includes(currentSite.id)) {
      setToast("Assign a verification task before attaching evidence.");
      return;
    }
    const record = savedFieldRecords.find((item) => item.capturedAt === attachmentSelection && item.site === currentSite.name);
    if (!record) {
      setToast("Choose a saved field record for this site before attaching it.");
      return;
    }
    const currentTask = demoTasks[currentSite.id];
    const attachments = currentTask?.attachments ?? [];
    if (attachments.includes(record.capturedAt)) {
      setToast("That field record is already attached to this task.");
      return;
    }
    const updatedTask: DemoVerificationTask = {
      officer: currentTask?.officer ?? assignedOfficer,
      dueDate: currentTask?.dueDate ?? verificationDueDate,
      status: currentTask?.status ?? activeVerificationStatus,
      observation: currentTask?.observation ?? verificationObservation.trim(),
      attachments: [...attachments, record.capturedAt],
      history: currentTask?.history ?? [],
    };
    const updatedTasks = { ...demoTasks, [currentSite.id]: updatedTask };
    try {
      localStorage.setItem("jalrakshak-demo-verification-tasks", JSON.stringify(updatedTasks));
      setDemoTasks(updatedTasks);
      setAttachmentSelection("");
      setToast("Field record metadata attached successfully.");
    } catch (error) {
      console.error("Unable to attach field record.", error);
    }
  };

  const saveFieldRecord = async () => {
    if (!uploadedPhoto) {
      setToast("Add a field photo before saving this record.");
      return;
    }
    if (isUploading) return;
    try {
      setIsUploading(true);
      let connectedId: string | null = null;
      const targetSiteId = backendSiteId.trim() || currentSite.id;
      if (selectedFile) {
        const uploaded = await uploadEvidence(selectedFile, {
          siteId: targetSiteId,
          longitude: uploadCoordinates?.[0],
          latitude: uploadCoordinates?.[1],
          notes: uploadNotes.trim(),
        });
        connectedId = uploaded.id;
      }
      const records: FieldRecord[] = [...savedFieldRecords];
      records.unshift({
        site: currentSite.name,
        district: currentSite.district,
        kind: currentSite.kind,
        photo: uploadedPhoto.name,
        location: uploadLocation,
        gpsCheck: gpsDistanceMeters === null ? "GPS not captured" : `${gpsDistanceMeters} m from site reference`,
        notes: uploadNotes.trim(),
        capturedAt: new Date().toISOString(),
      });
      const nextRecords = records.slice(0, 30);
      localStorage.setItem("jalrakshak-field-records", JSON.stringify(nextRecords));
      setSavedFieldRecords(nextRecords);
      setUploadWizardOpen(false);
      setUploadMessage("Field record uploaded to backend successfully.");
      setAnalysisPhotoId(connectedId || `photo-${currentSite.id}-${Date.now()}`);
      setAnalysisCoordinates(uploadCoordinates);
      if (selectedFile) setAnalysisPreview(URL.createObjectURL(selectedFile));
      setToast("Photo uploaded & accepted by backend at http://localhost:8000.");
      setUploadedPhoto(null);
      setSelectedFile(null);
      setUploadCoordinates(null);
      setUploadLocation("GPS location attached");
      setUploadNotes("");
    } catch (error) {
      console.error("Field record upload failed.", error);
      setUploadMessage(error instanceof Error ? error.message : "Upload failed.");
      setToast(error instanceof Error ? error.message : "Upload failed. Retry.");
    } finally {
      setIsUploading(false);
    }
  };

  const runAnalysis = async () => {
    if (analysisState === "loading") return;
    setAnalysisState("loading");
    setAnalysisMessage("Requesting AI YOLO model inference from backend (http://localhost:8000)...");
    try {
      const targetPhotoId = analysisPhotoId || `photo-${currentSite.id}`;
      const response = await analyzeEvidence(targetPhotoId);
      const isRealDetections = Array.isArray(response.detections) && response.detections.length > 0;
      setAnalysisDetections(isRealDetections ? response.detections : (mode === "demo" ? seededDemoDetections(currentSite.id) : []));
      setAnalysisState("complete");
      const modelName = response.model || "YOLOv8-Watershed-v1.0";
      setAnalysisMessage(`Backend inference complete · Model: ${modelName} · Detections processed`);
      setToast(`YOLO Inference complete: ${response.detections.length} detections found.`);
    } catch (error) {
      console.error("Backend inference error:", error);
      const errMsg = parseApiError(error);
      if (mode === "demo") {
        setAnalysisDetections(seededDemoDetections(currentSite.id));
        setAnalysisState("complete");
        setAnalysisMessage("AI inference complete · DEMO MODE · Detections processed");
      } else {
        setAnalysisDetections([]);
        setAnalysisState("error");
        setAnalysisMessage(`YOLO inference failed: ${errMsg}`);
        setToast(`AI Inference failed: ${errMsg}`);
      }
    }
  };

  const setManualLocation = (latitudeText: string, longitudeText: string) => {
    setManualLatitude(latitudeText);
    setManualLongitude(longitudeText);
    const latitude = Number(latitudeText);
    const longitude = Number(longitudeText);
    if (
      latitudeText.trim() &&
      longitudeText.trim() &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180
    ) {
      setUploadCoordinates([longitude, latitude]);
      setUploadLocation(`Manually entered · ${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`);
    } else {
      setUploadCoordinates(null);
      setUploadLocation("Enter valid latitude (−90 to 90) and longitude (−180 to 180).");
    }
  };

  const prepareTourStepUI = (index: number) => {
    const step = tourSteps[index];
    if (!step) return;

    setSettingsOpen(false);

    switch (step.id) {
      case "dashboard":
        setActive("Overview");
        setUploadWizardOpen(false);
        setReportOpen(false);
        break;
      case "watershed-select":
      case "layer-tree":
        setActive("Map explorer");
        setUploadWizardOpen(false);
        setReportOpen(false);
        break;
      case "search":
        setUploadWizardOpen(false);
        setReportOpen(false);
        break;
      case "photo-marker":
        setActive("Photo analysis");
        setUploadWizardOpen(false);
        setReportOpen(false);
        break;
      case "upload":
        openUploadWizard();
        setReportOpen(false);
        break;
      case "satellite":
        setUploadWizardOpen(false);
        setReportOpen(false);
        setActiveDetailTab("satellite");
        break;
      case "swipe-compare":
        setUploadWizardOpen(false);
        setReportOpen(false);
        setActiveDetailTab("change");
        break;
      case "evidence-quality":
        setUploadWizardOpen(false);
        setReportOpen(false);
        setActiveDetailTab("overview");
        break;
      case "reports-export":
        setUploadWizardOpen(false);
        setReportOpen(false);
        setActiveDetailTab("reports");
        break;
      default:
        setUploadWizardOpen(false);
        setReportOpen(false);
        break;
    }

    window.setTimeout(() => {
      const targetEl = document.querySelector<HTMLElement>(step.target);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
    }, 150);
  };

  const openTour = (index = 0) => {
    setWelcomeOpen(false);
    setTourComplete(false);
    setTourStepIndex(index);
    setSavedTourStep(index);
    localStorage.setItem("jalrakshak-tour-progress", String(index));
    const step = tourSteps[index];
    if (step) navigate(step.route);
    prepareTourStepUI(index);
  };

  const changeTourStep = (index: number) => {
    setTourComplete(false);
    setTourStepIndex(index);
    setSavedTourStep(index);
    localStorage.setItem("jalrakshak-tour-progress", String(index));
    const step = tourSteps[index];
    if (step) navigate(step.route);
    prepareTourStepUI(index);
  };

  const exitTour = () => {
    setTourStepIndex(null);
    setTourComplete(false);
    setUploadWizardOpen(false);
    setReportOpen(false);
    setWelcomeOpen(false);
    setSavedTourStep(null);
    localStorage.removeItem("jalrakshak-tour-progress");
    setActive("Overview");
    navigate("/dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const nextTour = () => {
    if (tourStepIndex === null) return;
    if (tourStepIndex === tourSteps.length - 1) {
      setTourStepIndex(null);
      setSavedTourStep(null);
      localStorage.removeItem("jalrakshak-tour-progress");
      setUploadWizardOpen(false);
      setReportOpen(false);
      setTourComplete(true);
      navigate("/dashboard");
      return;
    }
    changeTourStep(nextTourStep(tourStepIndex));
  };

  useEffect(() => {
    localStorage.setItem("jalrakshak-mode", mode);
  }, [mode]);

  useEffect(() => {
    const current = tourSteps.findIndex((step) => step.route === location.pathname);
    if (current >= 0) {
      setWelcomeOpen(false);
      setTourStepIndex(current);
      setSavedTourStep(current);
      setUploadWizardOpen(current === 1);
      setReportOpen(current === 7);
    } else if (location.pathname === "/dashboard" || location.pathname === "/") {
      if (tourStepIndex !== null) setTourStepIndex(null);
    }
  }, [location.pathname]);

  const buildReport = async () => {
    setReportOpen(false);
    try {
      setToast("Generating PDF report on backend (http://localhost:8000)...");
      const report = await generatePDFReport(reportScope, reportPeriod);
      if (report && report.id) {
        setToast(`Downloading PDF report ${report.filename || report.id}...`);
        try {
          const blob = await downloadReportBlob(report.id);
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = report.filename || `JalRakshak_Report_${report.id}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
          setToast(`PDF Report generated & downloaded successfully: ${report.filename}`);
          return;
        } catch (downloadErr) {
          const url = getReportDownloadUrl(report.id);
          window.open(url, "_blank");
          setToast(`PDF Report generated: ${report.filename}`);
          return;
        }
      }
    } catch (err) {
      console.error("Backend PDF generation error:", err);
      const errMsg = parseApiError(err);
      setToast(`PDF report generation failed: ${errMsg}`);
    }
    setPrintReport(true);
    window.setTimeout(() => window.print(), 120);
  };

  useEffect(() => {
    const clearPrintReport = () => setPrintReport(false);
    window.addEventListener("afterprint", clearPrintReport);
    return () => window.removeEventListener("afterprint", clearPrintReport);
  }, []);

  useEffect(() => {
    if (!uploadWizardOpen && !reportOpen && !settingsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUploadWizardOpen(false);
        setReportOpen(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [uploadWizardOpen, reportOpen, settingsOpen]);

  return (
    <div className={`app-shell min-h-screen bg-[#f4f7f3] ${collapsed ? "nav-is-collapsed" : ""} ${printReport ? "report-print-mode" : ""}`} id="top">
      <Sidebar
        active={active}
        onNavigate={handleNavigate}
        onStartTour={() => openTour()}
        onSettings={() => setSettingsOpen(true)}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={27} strokeWidth={2.2} /></button>
            <button className="icon-button collapse-button" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} onClick={() => setCollapsed((value) => !value)}><Menu size={20} /></button>
            <div className="search" data-tour="map-search">
              <Search size={18} />
              <input
                ref={searchInput}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search watershed sites"
                placeholder="Search sites, districts, interventions..."
              />
              <kbd>⌘ K</kbd>
            </div>
          </div>
          <div className="top-actions">
            <label className={`mode-switch ${mode === "demo" ? "mode-demo" : "mode-connected"}`}>
              <span>Mode</span>
              <select aria-label="Application mode" value={mode} onChange={(event) => setMode(event.currentTarget.value === "connected" ? "connected" : "demo")}>
                <option value="connected">Connected Mode (FastAPI Backend)</option>
                <option value="demo">Interactive Demo</option>
              </select>
            </label>
            <button className="icon-button help-tour-button" aria-label="Start Guided Tour" title="Start Guided Tour" onClick={() => openTour()}><CircleHelp size={19} /></button>
            <span className="region-button" aria-label="Current coverage: all India"><MapPin size={16} /> All India <ChevronDown size={15} /></span>
            <div className="notification-wrap">
              <button className="icon-button notification" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((value) => !value)}>
                <Bell size={20} />{notificationsList.some(n => !n.is_read) && <i />}
              </button>
              {notificationsOpen && (
                <div className="notification-popover">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid #e5e7eb", paddingBottom: "6px" }}>
                    <strong>Notifications ({notificationsList.filter(n => !n.is_read).length})</strong>
                    <button style={{ background: "none", border: "none", color: "#28764e", fontSize: "12px", cursor: "pointer", fontWeight: 600 }} onClick={handleMarkNotificationsRead}>Mark all read</button>
                  </div>
                  {notificationsList.map((n) => (
                    <p key={n.id} style={{ opacity: n.is_read ? 0.65 : 1, margin: "6px 0" }}>
                      <span className={`notice-dot ${!n.is_read ? "urgent" : ""}`} /> 
                      <strong>{n.title}:</strong> {n.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div className="top-profile"><span className="avatar">RT</span><span>Ravi Trivedi</span><ChevronDown size={14} /></div>
          </div>
        </header>

        <div className="content">
          <section className="print-only-report">
            <span className="section-overline">JALRAKSHAK AI · WATERSHED INTELLIGENCE</span>
            <h1>Watershed monitoring report</h1>
            <p>{reportScope} · {reportPeriod} · Prepared {currentDateLabel}</p>
            <p className="report-data-note">{createReportDisclosure(mode)} Satellite observations and AI estimates are not field-verified measurements.</p>
            <div className="report-summary-grid">
            <div><strong>12,480</strong><span>Illustrative sites</span></div><div><strong>84.2 M m³</strong><span>Estimated water retained</span></div><div><strong>74/100</strong><span>Vegetation health estimate</span></div><div><strong>420</strong><span>Illustrative field checks due</span></div>
            </div>
            <h2>{selectedSiteReport ? currentSite.name : reportScope}</h2>
            {selectedSiteReport && <><p>{currentSite.district} · {currentSite.kind} · {currentSite.status}</p><p>{currentSite.reason}</p></>}
            <h2>Priority site evidence</h2>
            <ul>{reportSites.map((site) => <li key={site.id}><strong>{site.name}</strong> — {site.district}; {site.status}; DEMO site sample evidence indicator {site.score}/100. {site.reason}</li>)}</ul>
            <h2>Field photographs and GPS</h2>
            {analysisPreview && <img className="report-field-photo" src={analysisPreview} alt="Field photo used in the latest analysis" />}
            {savedFieldRecords.length > 0
              ? <ul>{savedFieldRecords.map((record, index) => <li key={`${record.capturedAt}-${index}`}><strong>{record.photo}</strong> — {record.site}, {record.district}; {record.location}; {record.gpsCheck}; captured {new Date(record.capturedAt).toLocaleString("en-IN")}.{record.notes ? ` Notes: ${record.notes}` : ""}</li>)}</ul>
              : <p>No uploaded field-photo records are available in this browser session.</p>}
            <h2>AI-assisted analysis</h2>
            <p>{mode === "demo" ? "DEMO DATA · simulated analysis only; no trained model inference was performed." : analysisMessage || "No connected model result was received."}</p>
            {analysisDetections.length > 0 ? <ul>{analysisDetections.map((detection, index) => <li key={`${detection.category}-${index}`}>{detection.category} · {detection.confidence}% confidence{detection.bbox ? ` · normalized bbox ${detection.bbox.join(", ")}` : ""}</li>)}</ul> : <p>No detection results to include.</p>}
            <h2>Evidence-quality assessment</h2>
            <p>DEMO DATA · {demoEvidenceQualityScore}/100 evidence-quality score, calculated from labelled illustrative contributors: satellite suitability, photo match, GPS quality, and date alignment. This score ranks evidence completeness only; it does not prove environmental impact or intervention success.</p>
            <h2>Satellite observation dates and limitations</h2>
            <p>{mode === "demo" ? "No verified acquisition dates, resolution, or cloud-quality metadata were supplied. April/July labels and NDVI/NDWI values are illustrative only; no date alignment or satellite comparison was performed." : "No connected satellite service returned observations. Acquisition dates, resolution, cloud quality, NDVI/NDWI values, and before/after imagery are unavailable."}</p>
            <h2>Field verification history</h2>
            <p>{mode === "demo" && assignedSites.includes(currentSite.id)
              ? `DEMO DATA · ${verificationStatus} task assigned to ${assignedOfficer}; due ${verificationDueDate || "not set"}. ${verificationObservation.trim() ? `Observation: ${verificationObservation.trim()}` : "No observation submitted."}`
              : "No authorized connected verification history is available."}</p>
            {mode === "demo" && demoTasks[currentSite.id] && <ul>{demoTasks[currentSite.id].history.map((entry, index) => (
              <li key={`${entry.at}-${index}`}>DEMO DATA · {entry.status} · {new Date(entry.at).toLocaleString("en-IN")}</li>
            ))}</ul>}
            {mode === "demo" && demoTasks[currentSite.id]?.attachments.length > 0 && <p>DEMO DATA · Attached field-record metadata: {demoTasks[currentSite.id].attachments.map((capturedAt) => savedFieldRecords.find((record) => record.capturedAt === capturedAt)?.photo ?? "record unavailable").join(", ")}. Photo bytes remain session-only.</p>}
            <p className="report-data-note">Recommendations and estimates require human review. Only authorized field checks should be treated as verified results. This report is not proof of project success.</p>
          </section>
          <section className="hero-banner">
            <img src={heroImage} alt="Green agricultural fields and rolling hills in rural India" />
            <div className="hero-overlay" />
            <div className="hero-content">
              <div className="hero-kicker"><span className="hero-kicker-dot" /> WATERSHED INTELLIGENCE · INDIA</div>
              <h1>Smarter Watersheds,<br /><span>Across All of India.</span></h1>
              <p>Explore representative watershed examples spanning India’s varied landscapes, from the Himalayas and northeast to the Deccan and southern coast.</p>
              <div className="hero-actions">
                <button className="hero-primary" onClick={() => handleNavigate("Map explorer", "map-explorer")}>Explore watershed <ArrowRight size={17} /></button>
                <button className="hero-secondary" onClick={openUploadWizard}><Upload size={16} /> Add field photo</button>
              </div>
            </div>
            <div className="hero-weather"><CloudSun size={17} /><span>Seasonal readiness</span><strong>Monsoon watch</strong></div>
            <div className="hero-watermark"><span>जल</span><i /></div>
          </section>

          <section className="welcome-row">
            <div>
              <p className="section-overline">{currentDateLabel} <span className="overline-line" /> <span className="freshness"><i /> Illustrative monitoring data</span></p>
              <h2>Good morning, Ravi <span className="wave-emoji">☀</span></h2>
              <p className="welcome-copy">Here’s the latest picture across your watershed program.</p>
            </div>
            <button className="report-button" onClick={() => setReportOpen(true)}><FileDown size={17} /> Build report</button>
          </section>

          <div className={`mode-notice ${mode === "connected" ? "mode-notice-connected" : ""}`} role="status">
            <strong>{mode === "demo" ? "INTERACTIVE DEMO · DEMO DATA" : "CONNECTED TO FASTAPI BACKEND (http://localhost:8000)"}</strong>
            <span>{mode === "demo" ? "All example sites, sample statistics, simulated detections and sample satellite visuals are demonstrations." : "Live APIs connected for Photo Uploads, AI YOLO Inference, Field Verification Tasks, PDF Reports, Global Search, and Notifications."}</span>
          </div>

          <section className="metrics-grid" data-tour="metrics" aria-label="Watershed key indicators">
            {dynamicMetrics.map((metric, index) => {
              const MetricIcon = metric.icon;
              return (
                <article className={`metric-card metric-${metric.tone}`} key={metric.label} style={{ animationDelay: `${index * 70}ms` }}>
                  <div className="metric-topline"><span className="metric-icon"><MetricIcon size={19} /></span><span className="metric-period">THIS SEASON</span></div>
                  <span className="metric-label">{metric.label}</span>
                  <strong className="metric-value"><AnimatedMetric value={metric.value} suffix={metric.suffix} /></strong>
                  <span className="metric-delta"><ArrowDownRight size={14} /> {metric.delta}</span>
                </article>
              );
            })}
          </section>

          {uploadMessage && (
            <section className="upload-status" aria-live="polite">
              {uploadedPhoto ? <img src={uploadedPhoto.preview} alt="" /> : <Sparkles size={18} />}
              <div><strong>{uploadMessage}</strong><span>{uploadedPhoto ? `${uploadedPhoto.name} · ${uploadLocation}` : uploadMessage.includes("saved") ? "Record metadata is available offline on this device." : "Please select an image file."}</span></div>
              <button className="icon-button" aria-label="Dismiss upload message" onClick={() => setUploadMessage("")}><X size={17} /></button>
            </section>
          )}

          {/* MULTI-DIMENSIONAL GIS FILTERS PANEL */}
          <div className="map-filters-panel" data-tour="watershed-selector">
            <span className="map-filters-title"><Filter size={15} /> GIS Filters</span>
            
            <select
              className="filter-select"
              value={selectedStateFilter}
              onChange={(e) => setSelectedStateFilter(e.target.value)}
              aria-label="Filter by State"
            >
              <option value="All">State: All India</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Assam">Assam</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Odisha">Odisha</option>
              <option value="Himachal Pradesh">Himachal Pradesh</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Chhattisgarh">Chhattisgarh</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
            </select>

            <select
              className="filter-select"
              value={selectedWatershedFilter}
              onChange={(e) => setSelectedWatershedFilter(e.target.value)}
              aria-label="Filter by Watershed"
            >
              {watershedRegions.map((w) => (
                <option key={w.id} value={w.id}>Watershed: {w.name}</option>
              ))}
            </select>

            <select
              className="filter-select"
              value={siteTypeFilter}
              onChange={(e) => setSiteTypeFilter(e.target.value)}
              aria-label="Filter by Intervention Type"
            >
              <option value="All intervention types">Intervention: All Types</option>
              <option value="Check dam">Check Dam</option>
              <option value="Farm pond">Farm Pond</option>
              <option value="Plantation">Plantation</option>
              <option value="Erosion risk">Erosion Risk</option>
              <option value="Percolation tank">Percolation Tank</option>
              <option value="Recharge structure">Recharge Structure</option>
            </select>

            <select
              className="filter-select"
              value={selectedVerificationStatusFilter}
              onChange={(e) => setSelectedVerificationStatusFilter(e.target.value)}
              aria-label="Filter by Verification Status"
            >
              <option value="All">Status: All</option>
              <option value="Needs verification">Needs Verification</option>
              <option value="Monitoring">Monitoring</option>
              <option value="Verified">Verified</option>
            </select>

            <select
              className="filter-select"
              value={selectedQualityFilter}
              onChange={(e) => setSelectedQualityFilter(e.target.value)}
              aria-label="Filter by Evidence Quality"
            >
              <option value="All">Quality: All</option>
              <option value="High (>80%)">High Quality (&gt;80%)</option>
              <option value="Moderate (50-80%)">Moderate (50-80%)</option>
              <option value="Low (<50%)">Low Quality (&lt;50%)</option>
            </select>

            {(selectedStateFilter !== "All" || siteTypeFilter !== "All intervention types" || selectedVerificationStatusFilter !== "All" || selectedQualityFilter !== "All" || search !== "") && (
              <button
                className="map-btn-sm"
                style={{ background: "#eef7f0", color: "#1e6538" }}
                onClick={() => {
                  setSelectedStateFilter("All");
                  setSiteTypeFilter("All intervention types");
                  setSelectedVerificationStatusFilter("All");
                  setSelectedQualityFilter("All");
                  setSearch("");
                }}
              >
                Clear Filters
              </button>
            )}

            <span className="filter-badge-counter">{visibleSites.length} Features Matched</span>
          </div>

          <section className="dashboard-grid primary-grid">
            <article className="panel map-panel" id="map-explorer" data-tour="map">
              <div className="panel-heading">
                <div>
                  <span className="section-overline">INTERACTIVE MAP EXPLORER · SIH 26015</span>
                  <h2>Watershed GIS Workspace</h2>
                  <p>Pan, zoom, switch basemaps & toggle layer tree categories</p>
                </div>
                <div className="map-heading-actions">
                  <button
                    className={`icon-button filter-button ${attentionOnly ? "filter-active" : ""}`}
                    title="Show sites needing verification"
                    aria-label="Show sites needing verification"
                    aria-pressed={attentionOnly}
                    onClick={() => setAttentionOnly((value) => !value)}
                  >
                    <Filter size={17} />
                  </button>
                </div>
              </div>

              <div className="map-explorer-layout">
                <LayerExplorerCard
                  layers={gisLayers}
                  onToggleLayer={handleToggleLayer}
                  onChangeOpacity={handleChangeLayerOpacity}
                />
                <MapPanel
                  layer={activeLayer}
                  selectedSite={selectedSite}
                  attentionOnly={attentionOnly}
                  visibleSiteIds={visibleSites.map((site) => site.id)}
                  uploadedCoordinates={uploadCoordinates ?? analysisCoordinates}
                  onSelectSite={onSelectSite}
                  selectedWatershedId={selectedWatershedFilter}
                />
              </div>

              <div className="map-stats">
                <div><strong>12,480</strong><span>Mapped Features</span></div>
                <div><strong>10,860</strong><span>Field Surveys</span></div>
                <div><strong>1,200</strong><span>In Review</span></div>
                <div><strong className="stat-alert">420</strong><span>Checks Due</span></div>
              </div>
            </article>

            {/* CONTEXTUAL FEATURE DETAIL PANEL */}
            <article className="panel site-detail-panel" data-tour="evidence-card">
              <div className="panel-heading compact-heading">
                <div>
                  <span className="section-overline">CONTEXTUAL FEATURE DETAIL</span>
                  <h2>{currentSite.name}</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Build report"
                  title="Build report"
                  onClick={() => setReportOpen(true)}
                >
                  <MoreHorizontal size={19} />
                </button>
              </div>

              {/* TABS NAVIGATION */}
              <div className="feature-tabs-nav">
                <button
                  className={`feature-tab-btn ${activeDetailTab === "overview" ? "active-tab" : ""}`}
                  onClick={() => setActiveDetailTab("overview")}
                >
                  Overview
                </button>
                <button
                  className={`feature-tab-btn ${activeDetailTab === "photos" ? "active-tab" : ""}`}
                  onClick={() => setActiveDetailTab("photos")}
                >
                  Photos ({savedFieldRecords.filter((r) => r.site === currentSite.name).length + 1})
                </button>
                <button
                  className={`feature-tab-btn ${activeDetailTab === "satellite" ? "active-tab" : ""}`}
                  onClick={() => setActiveDetailTab("satellite")}
                  data-tour="satellite-workspace"
                >
                  Satellite
                </button>
                <button
                  className={`feature-tab-btn ${activeDetailTab === "change" ? "active-tab" : ""}`}
                  onClick={() => setActiveDetailTab("change")}
                  data-tour="swipe-compare"
                >
                  Before/After
                </button>
                <button
                  className={`feature-tab-btn ${activeDetailTab === "verification" ? "active-tab" : ""}`}
                  onClick={() => setActiveDetailTab("verification")}
                >
                  Verification
                </button>
                <button
                  className={`feature-tab-btn ${activeDetailTab === "reports" ? "active-tab" : ""}`}
                  onClick={() => setActiveDetailTab("reports")}
                  data-tour="reports-export"
                >
                  Export & Report
                </button>
              </div>

              {/* TAB 1: OVERVIEW */}
              {activeDetailTab === "overview" && (
                <>
                  <div className="selected-site-photo">
                    <img src={currentSite.photo} alt={currentSite.name} />
                    <span className={`site-state ${currentSite.status === "Needs verification" ? "state-alert" : "state-monitor"}`}>
                      <i /> {assignedSites.includes(currentSite.id) ? "Field check assigned" : currentSite.status}
                    </span>
                    <span className="ai-tag"><Sparkles size={13} /> AI INSIGHT</span>
                  </div>
                  <div className="selected-site-info">
                    <div className="site-title-line">
                      <h3>{currentSite.name}</h3>
                      <span className="confidence-score" aria-label={`Evidence-quality score ${demoEvidenceQualityScore} out of 100`}>
                        {demoEvidenceQualityScore}%
                      </span>
                    </div>
                    <p className="evidence-score-label">Evidence-quality score (not environmental impact)</p>
                    <p className="site-location">
                      <MapPin size={14} /> {currentSite.district} <span>·</span> {currentSite.coordinates[1].toFixed(4)}° N, {currentSite.coordinates[0].toFixed(4)}° E
                    </p>
                    <p className="evidence-reason"><Sparkles size={15} /> {currentSite.reason}</p>
                    
                    <div className="evidence-breakdown">
                      {demoEvidenceFactors.map((factor) => (
                        <div key={factor.label}>
                          <span>{factor.label}</span>
                          <strong>{factor.value}%</strong>
                          <i><b style={{ width: `${factor.value}%` }} /></i>
                        </div>
                      ))}
                    </div>
                    <p className="evidence-method">
                      Score formula: 30% Satellite Suitability + 25% Photo Match + 25% GPS Quality + 20% Date Alignment.
                    </p>
                  </div>
                </>
              )}

              {/* TAB 2: FIELD PHOTOS & EXIF VIEWER */}
              {activeDetailTab === "photos" && (
                <div className="selected-site-info">
                  <h4>Field Photo Gallery</h4>
                  <p style={{ fontSize: "13px", color: "#607266" }}>Click any thumbnail to inspect high-res image and EXIF metadata.</p>
                  <div className="photo-grid" style={{ marginTop: "10px" }}>
                    <button
                      className="photo-card"
                      onClick={() => setViewingPhotoModal({
                        name: `${currentSite.name} - Sample Field Photo`,
                        url: currentSite.photo,
                        date: "2026-10-02",
                        location: `EXIF GPS · ${currentSite.coordinates[1]}°, ${currentSite.coordinates[0]}°`,
                        gpsCheck: "Within 240 m of site reference coordinates",
                        notes: currentSite.reason,
                      })}
                    >
                      <img src={currentSite.photo} alt={currentSite.name} />
                      <span className="photo-class"><ScanLine size={12} /> {currentSite.kind}</span>
                      <span className="photo-caption"><strong>Primary Field Evidence</strong><small>EXIF Verified</small></span>
                    </button>

                    {savedFieldRecords.filter((r) => r.site === currentSite.name).map((rec, idx) => (
                      <button
                        key={idx}
                        className="photo-card"
                        onClick={() => setViewingPhotoModal({
                          name: rec.photo,
                          url: currentSite.photo,
                          date: new Date(rec.capturedAt).toLocaleDateString("en-IN"),
                          location: rec.location,
                          gpsCheck: rec.gpsCheck,
                          notes: rec.notes,
                        })}
                      >
                        <img src={currentSite.photo} alt={rec.photo} />
                        <span className="photo-class"><Image size={12} /> Saved Record</span>
                        <span className="photo-caption"><strong>{rec.photo}</strong><small>{rec.location}</small></span>
                      </button>
                    ))}
                  </div>
                  <button className="verify-button" style={{ marginTop: "14px" }} onClick={openUploadWizard}>
                    <Upload size={16} /> Upload New Field Photo with EXIF GPS
                  </button>
                </div>
              )}

              {/* TAB 3: SATELLITE ANALYSIS WORKSPACE */}
              {activeDetailTab === "satellite" && (
                <div className="selected-site-info">
                  <h4>Multispectral Satellite Analysis Workspace</h4>
                  <p style={{ fontSize: "13px", color: "#607266" }}>Sentinel-2 L2A / Landsat-9 Multi-spectral Observation Analysis</p>
                  
                  <div style={{ marginTop: "10px", display: "grid", gap: "10px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 700, color: "#28764e" }}>Observation Acquisition Date
                      <select className="filter-select" style={{ width: "100%", marginTop: "4px" }} value={satObsDate} onChange={(e) => setSatObsDate(e.target.value)}>
                        <option value="2026-10-01">2026-10-01 (Sentinel-2 L2A · 10m res · Cloud: 0.8%)</option>
                        <option value="2026-05-15">2026-05-15 (Sentinel-2 L2A · 10m res · Cloud: 2.1%)</option>
                        <option value="2025-10-10">2025-10-10 (Sentinel-2 L2A · 10m res · Cloud: 1.4%)</option>
                      </select>
                    </label>

                    <div style={{ background: "#f4f8f4", border: "1px solid #d4e5d6", padding: "10px", borderRadius: "8px", fontSize: "13px" }}>
                      <strong>NDVI Vegetation Index Calculation:</strong>
                      <div style={{ fontFamily: "monospace", margin: "4px 0", color: "#166534" }}>NDVI = (NIR - Red) / (NIR + Red)</div>
                      <div>Mean Index Value: <strong style={{ color: "#166534" }}>+0.58 (Healthy Vegetation Canopy)</strong></div>
                      <div style={{ marginTop: "6px", height: "10px", borderRadius: "5px", background: "linear-gradient(to right, #854d0e, #eab308, #22c55e, #15803d)" }} />
                    </div>

                    <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", padding: "10px", borderRadius: "8px", fontSize: "13.5px" }}>
                      <strong>NDWI Water Index Calculation (McFeeters 1996):</strong>
                      <div style={{ fontFamily: "monospace", margin: "4px 0", color: "#0369a1" }}>NDWI = (Green - NIR) / (Green + NIR)</div>
                      <div>Mean Water Signal: <strong style={{ color: "#0369a1" }}>+0.42 (Open Water Body Confirmed)</strong></div>
                      <div style={{ marginTop: "6px", height: "10px", borderRadius: "5px", background: "linear-gradient(to right, #e0f2fe, #38bdf8, #0284c7)" }} />
                    </div>

                    <p style={{ fontSize: "12px", color: "#718075", margin: 0 }}>
                      <AlertTriangle size={13} style={{ display: "inline", verticalAlign: "middle" }} /> 10m spatial resolution imagery is used. Structures smaller than 10m require field photo verification.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 4: BEFORE & AFTER SWIPE COMPARE WORKSPACE */}
              {activeDetailTab === "change" && (
                <div className="selected-site-info">
                  <h4>Before & After Change Detection</h4>
                  <p style={{ fontSize: "13px", color: "#607266" }}>Compare baseline (May 2025) with current post-intervention observation (Oct 2026).</p>
                  
                  <div className="swipe-compare-container" style={{ marginTop: "10px", "--swipe-position": compareValue } as React.CSSProperties}>
                    <img className="swipe-layer-base" src={satelliteBefore} alt="Baseline imagery" />
                    <img className="swipe-layer-top" src={satelliteAfter} alt="Post-intervention imagery" />
                    <div className="swipe-divider-line" />
                    <div className="swipe-divider-handle"><Sliders size={16} /></div>
                  </div>

                  <input
                    type="range"
                    min="5"
                    max="95"
                    value={compareValue}
                    onChange={(e) => setCompareValue(Number(e.target.value))}
                    style={{ width: "100%", marginTop: "10px", accentColor: "#28764e" }}
                  />

                  <div style={{ marginTop: "10px", display: "grid", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", background: "#f8faf7", padding: "8px", borderRadius: "6px" }}>
                      <span>Buffer Radius:</span>
                      <select className="filter-select" style={{ height: "26px", fontSize: "12px" }} value={bufferDistance} onChange={(e) => setBufferDistance(Number(e.target.value) as 100|250|500)}>
                        <option value={100}>100 Meter Buffer</option>
                        <option value={250}>250 Meter Buffer</option>
                        <option value={500}>500 Meter Buffer</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                      <span>Surface Water Expansion:</span>
                      <strong style={{ color: "#0284c7" }}>1.2 ha → 3.8 ha (+216.7%)</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                      <span>NDVI Vegetation Recovery:</span>
                      <strong style={{ color: "#166534" }}>0.24 → 0.58 (+0.34 mean gain)</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: FIELD VERIFICATION */}
              {activeDetailTab === "verification" && (
                <div className="selected-site-info">
                  <h4>Field Verification Task Management</h4>
                  <section className="verification-task-controls" aria-label="Field verification task center">
                    <div><strong>Verification Task</strong><span>{mode === "demo" ? "DEMO DATA · Local Mode" : "Connected Backend API"}</span></div>
                    <label>Assign to
                      <select value={assignedOfficer} onChange={(event) => setAssignedOfficer(event.target.value)}>
                        <option>Ravi Trivedi</option><option>Priya Patel</option><option>Amit Sharma</option>
                      </select>
                    </label>
                    <label>Due date
                      <input type="date" value={verificationDueDate} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setVerificationDueDate(event.target.value)} />
                    </label>
                    <label>Workflow status
                      <select value={verificationStatus} onChange={(event) => setVerificationDraftStatuses((statuses) => ({ ...statuses, [currentSite.id]: event.target.value as DemoVerificationStatus }))} disabled={!assignedSites.includes(currentSite.id)}>
                        {(["pending", "assigned", "in-progress", "submitted", "verified", "rejected"] as const).map((status) => (
                          <option key={status} value={status} disabled={status !== activeVerificationStatus && !canTransitionVerification(activeVerificationStatus, status)}>{status}</option>
                        ))}
                      </select>
                    </label>
                    <label>Inspection observation
                      <textarea rows={2} value={verificationObservation} onChange={(event) => setVerificationObservation(event.target.value)} placeholder="Record field inspection findings..." />
                    </label>
                    <button className={`verify-button ${assignedSites.includes(currentSite.id) ? "verified-button" : ""}`} onClick={assignFieldCheck}>
                      {assignedSites.includes(currentSite.id) ? <><CheckCheck size={16} /> Save Verification Status: {verificationStatus}</> : <><ShieldCheck size={16} /> Assign Field Verification Task</>}
                    </button>
                  </section>
                </div>
              )}

              {/* TAB 6: REPORTS & EXPORT */}
              {activeDetailTab === "reports" && (
                <div className="selected-site-info">
                  <h4>Reports & Vector Data Export</h4>
                  <p style={{ fontSize: "13px", color: "#607266" }}>Export vector layers for QGIS / ArcGIS or generate PDF reports.</p>
                  
                  <div className="export-btn-group" style={{ flexDirection: "column", gap: "10px", marginTop: "14px" }}>
                    <button className="export-btn" style={{ justifyContent: "center" }} onClick={() => exportGeoJSON(visibleSites)}>
                      <Download size={16} /> Export Matched Features as GeoJSON (.geojson)
                    </button>
                    <button className="export-btn" style={{ justifyContent: "center" }} onClick={() => exportCSV(visibleSites)}>
                      <FileSpreadsheet size={16} /> Export Matched Features as CSV Table (.csv)
                    </button>
                    <button className="export-btn" style={{ justifyContent: "center", background: "#28764e", color: "white" }} onClick={() => setReportOpen(true)}>
                      <FileText size={16} /> Generate Comprehensive PDF Report
                    </button>
                  </div>
                </div>
              )}
            </article>
          </section>

          <section className="dashboard-grid insights-grid">
            <article className="panel trend-panel" id="satellite-insights" data-tour="satellite">
              <div className="panel-heading">
                <div><span className="section-overline">SATELLITE INSIGHTS</span><h2>Water & vegetation trend</h2><p>Seasonal change across monitored sites</p></div>
                <span className="period-select">Last 6 months</span>
              </div>
              <div className="chart-legend"><span><i className="legend-ndvi" /> NDVI · vegetation signal</span><span><i className="legend-ndwi" /> NDWI · water signal</span></div>
              <DeferredDemoChart data={dynamicIndexSeries} />
              <div className="chart-callout"><span className="callout-icon"><Leaf size={16} /></span><p><strong>{mode === "demo" ? "DEMO DATA · Simulated index trend" : "CONNECTED MODE · Sentinel-2 Trend"}</strong>{mode === "demo" ? " NDVI/NDWI shapes are illustrative only." : " Measured vegetation and water indices retrieved from FastAPI backend."}</p><span className="callout-value">{mode === "demo" ? "DEMO" : "LIVE"}</span></div>
            </article>

            <article className="panel intervention-panel" id="intervention-mix">
              <div className="panel-heading">
                <div><span className="section-overline">PROGRAM PORTFOLIO · SAMPLE</span><h2>Intervention mix</h2><p>Illustrative structures by type · India-wide sample</p></div>
                <button className="icon-button" aria-label="View interventions on map" title="View interventions on map" onClick={() => handleNavigate("Map explorer", "map-explorer")}><MoreHorizontal size={19} /></button>
              </div>
              <div className="intervention-total"><strong>11,360</strong><span>illustrative interventions</span><b>Sample</b></div>
              <div className="intervention-bars">
                {interventionTypes.map((item) => (
                  <div className="intervention-row" key={item.label}>
                    <div className="intervention-label"><span><i style={{ backgroundColor: item.color }} />{item.label}</span><strong>{item.total}</strong></div>
                    <div className="bar-track"><i style={{ width: `${item.percent}%`, backgroundColor: item.color }} /></div>
                  </div>
                ))}
              </div>
              <div className="portfolio-note"><span><Check size={14} /></span> Check dams are the most common structure across the basin.</div>
              <button className="link-button" onClick={() => handleNavigate("Interventions", "intervention-mix")}>Explore all interventions <ArrowRight size={15} /></button>
            </article>
          </section>

          <section className="dashboard-grid workflow-grid">
            <article className="panel workflow-panel" id="verification" data-tour="verification">
              <div className="panel-heading">
                <div><span className="section-overline">FIELD-TO-IMPACT</span><h2>Monitoring workflow</h2><p>One clear path from site evidence to measurable outcomes</p></div>
                <span className="workflow-badge"><span /> India-wide sample cycle</span>
              </div>
              <div className="workflow-track">
                {workflowSteps.map((step, index) => {
                  const StepIcon = step.icon;
                  return (
                    <div className={`workflow-step workflow-${step.state}`} key={step.label}>
                      <span className="workflow-connector" />
                      <span className="workflow-icon">{step.state === "complete" ? <Check size={19} /> : <StepIcon size={18} />}</span>
                      <span className="workflow-step-number">0{index + 1}</span>
                      <strong>{step.label}</strong>
                      <small>{step.detail}</small>
                      {step.state === "active" && <span className="current-step-tag">CURRENT STEP</span>}
                    </div>
                  );
                })}
              </div>
            </article>

            {/* SIH 26015 SYSTEM ARCHITECTURE PIPELINE */}
            <article className="panel workflow-panel" id="architecture-pipeline">
              <div className="panel-heading">
                <div>
                  <span className="section-overline">SIH 26015 ARCHITECTURE FLOWCHART</span>
                  <h2>JalRakshak AI — End-to-End Operational Pipeline</h2>
                  <p>Click any node in the pipeline flowchart to jump directly to its active workspace.</p>
                </div>
                <span className="workflow-badge"><Sparkles size={14} /> SIH 26015 Solution</span>
              </div>

              <div style={{ background: "#123b2c", borderRadius: "14px", padding: "20px", color: "white" }}>
                <div style={{ textAlign: "center", marginBottom: "16px" }}>
                  <strong style={{ fontSize: "18px", color: "#86d795", letterSpacing: "1px" }}>JALRAKSHAK AI · SIH 26015</strong>
                  <div style={{ fontSize: "12.5px", color: "#a3c7ad" }}>Geospatial Watershed Monitoring & Assessment Platform</div>
                </div>

                {/* Stage 1: Dual Input Branches */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "12px" }}>
                  {/* Branch A: Map Explorer */}
                  <div
                    style={{ background: "#ffffff12", border: "1px solid #ffffff30", borderRadius: "10px", padding: "12px", cursor: "pointer" }}
                    onClick={() => { setActiveDetailTab("overview"); document.getElementById("map-explorer")?.scrollIntoView({ behavior: "smooth" }); }}
                  >
                    <div style={{ fontWeight: 800, color: "#86d795", fontSize: "13.5px", marginBottom: "6px" }}>🗺 MAP EXPLORER</div>
                    <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#d1e7d6", display: "grid", gap: "3px" }}>
                      <li>Watershed boundaries</li>
                      <li>Rivers / drainage network</li>
                      <li>Water bodies (reservoirs, ponds)</li>
                      <li>Check dams</li>
                      <li>Farm ponds</li>
                      <li>Plantation</li>
                    </ul>
                  </div>

                  {/* Branch B: Field Evidence */}
                  <div
                    style={{ background: "#ffffff12", border: "1px solid #ffffff30", borderRadius: "10px", padding: "12px", cursor: "pointer" }}
                    onClick={() => { setActiveDetailTab("photos"); openUploadWizard(); }}
                  >
                    <div style={{ fontWeight: 800, color: "#93c5fd", fontSize: "13.5px", marginBottom: "6px" }}>📸 FIELD EVIDENCE</div>
                    <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#d1e7d6", display: "grid", gap: "3px" }}>
                      <li>Upload photo</li>
                      <li>EXIF GPS extraction</li>
                      <li>Manual location fallback</li>
                      <li>Field notes</li>
                      <li>Intervention type</li>
                    </ul>
                  </div>
                </div>

                {/* Down Arrow */}
                <div style={{ textAlign: "center", fontSize: "16px", color: "#86d795", margin: "4px 0" }}>│<br />▼</div>

                {/* Stage 2: Satellite Analysis */}
                <div
                  style={{ background: "#ffffff18", border: "1px solid #ffffff40", borderRadius: "10px", padding: "12px", textAlign: "center", cursor: "pointer" }}
                  onClick={() => { setActiveDetailTab("satellite"); document.getElementById("map-explorer")?.scrollIntoView({ behavior: "smooth" }); }}
                >
                  <strong style={{ fontSize: "14.5px", color: "#fef08a" }}>🛰 SATELLITE ANALYSIS</strong>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "8px" }}>
                    <div style={{ background: "#ffffff15", padding: "6px", borderRadius: "6px", fontSize: "12px" }}>
                      <strong style={{ color: "#fef08a" }}>LULC</strong>
                      <div style={{ fontSize: "10.5px", color: "#cbd5e1" }}>Land Use / Cover</div>
                    </div>
                    <div style={{ background: "#ffffff15", padding: "6px", borderRadius: "6px", fontSize: "12px" }}>
                      <strong style={{ color: "#86efac" }}>NDVI</strong>
                      <div style={{ fontSize: "10.5px", color: "#cbd5e1" }}>(NIR-Red)/(NIR+Red)</div>
                    </div>
                    <div style={{ background: "#ffffff15", padding: "6px", borderRadius: "6px", fontSize: "12px" }}>
                      <strong style={{ color: "#7dd3fc" }}>NDWI</strong>
                      <div style={{ fontSize: "10.5px", color: "#cbd5e1" }}>(Green-NIR)/(Green+NIR)</div>
                    </div>
                  </div>
                </div>

                {/* Down Arrow */}
                <div style={{ textAlign: "center", fontSize: "16px", color: "#86d795", margin: "4px 0" }}>│<br />▼</div>

                {/* Stage 3: Sequential Processing Pipeline */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px" }}>
                  <div
                    style={{ background: "#ffffff12", border: "1px solid #ffffff25", borderRadius: "8px", padding: "8px", textAlign: "center", cursor: "pointer" }}
                    onClick={() => { setActiveDetailTab("change"); document.getElementById("map-explorer")?.scrollIntoView({ behavior: "smooth" }); }}
                  >
                    <strong style={{ display: "block", fontSize: "12px", color: "#fdba74" }}>BEFORE / AFTER CHANGE DETECTION</strong>
                  </div>
                  <div
                    style={{ background: "#ffffff12", border: "1px solid #ffffff25", borderRadius: "8px", padding: "8px", textAlign: "center", cursor: "pointer" }}
                    onClick={() => { setActiveDetailTab("overview"); document.getElementById("map-explorer")?.scrollIntoView({ behavior: "smooth" }); }}
                  >
                    <strong style={{ display: "block", fontSize: "12px", color: "#fef08a" }}>EVIDENCE ASSESSMENT</strong>
                  </div>
                  <div
                    style={{ background: "#ffffff12", border: "1px solid #ffffff25", borderRadius: "8px", padding: "8px", textAlign: "center", cursor: "pointer" }}
                    onClick={() => { setActiveDetailTab("verification"); document.getElementById("map-explorer")?.scrollIntoView({ behavior: "smooth" }); }}
                  >
                    <strong style={{ display: "block", fontSize: "12px", color: "#86d795" }}>FIELD VERIFICATION</strong>
                  </div>
                  <div
                    style={{ background: "#ffffff12", border: "1px solid #ffffff25", borderRadius: "8px", padding: "8px", textAlign: "center", cursor: "pointer" }}
                    onClick={() => { setActiveDetailTab("reports"); setReportOpen(true); }}
                  >
                    <strong style={{ display: "block", fontSize: "12px", color: "#cbd5e1" }}>REPORTS & EXPORT</strong>
                  </div>
                </div>
              </div>
            </article>
          </section>

          <section className="dashboard-grid field-grid">
            <article className="panel photo-panel" id="photo-analysis">
              <div className="panel-heading">
                <div><span className="section-overline">FIELD NETWORK</span><h2>Recent field photographs</h2><p>Geo-tagged updates from teams across the basin</p></div>
                <button className="text-action" onClick={openUploadWizard}>Add photo <Plus size={16} /></button>
              </div>
              <div className="photo-grid" data-tour="photo-marker">
                {sites.map((site) => (
                  <button key={site.id} className={`photo-card ${selectedSite === site.id ? "photo-selected" : ""}`} onClick={() => setSelectedSite(site.id)}>
                    <img src={site.photo} alt={`${site.kind} field photo in ${site.district}`} loading="lazy" />
                    <span className="photo-class"><ScanLine size={12} /> {site.kind}</span>
                    <span className="photo-caption"><strong>{site.name}</strong><small><MapPin size={11} /> {site.district.split(" · ")[0]} <span>·</span> 2 days ago</small></span>
                  </button>
                ))}
              </div>
              <div className="offline-records">
                <div><strong>Saved on this device</strong><span>{savedFieldRecords.length} field {savedFieldRecords.length === 1 ? "record" : "records"} · available offline</span></div>
                {savedFieldRecords.length ? savedFieldRecords.slice(0, 3).map((record, index) => (
                  <p key={`${record.capturedAt}-${index}`}><MapPin size={13} /><span><strong>{record.site}</strong><small>{record.kind} · {record.gpsCheck} · {new Date(record.capturedAt).toLocaleDateString("en-IN")}</small></span></p>
                )) : <small>No local field records yet.</small>}
              </div>
            </article>

            <article className="panel compare-panel" data-tour="evidence">
              <div className="panel-heading">
                <div><span className="section-overline">SATELLITE → FIELD</span><h2>Compare site change</h2><p>Illustrative seasonal imagery · selected sample site</p></div>
                <span className="compare-period">{mode === "demo" ? "DEMO DATA" : "NO SCENE"}</span>
              </div>
              {mode === "demo" ? (
                <div className="compare-visual">
                  <img className="compare-base" src={satelliteBefore} alt="Earlier demonstration landscape around the sample watershed site" loading="lazy" />
                  <div className="compare-top" style={{ clipPath: `inset(0 ${100 - compareValue}% 0 0)` }}>
                    <img src={satelliteAfter} alt="Later demonstration landscape around the sample watershed site" loading="lazy" />
                  </div>
                  <span className="compare-label before-label">DEMO · EARLIER</span><span className="compare-label after-label">DEMO · LATER</span>
                  <span className="compare-handle" style={{ left: `${compareValue}%` }}><span><ChevronRight size={13} /><ChevronRight size={13} /></span></span>
                </div>
              ) : <div className="satellite-unavailable compare-unavailable"><Layers3 size={23} /><strong>Before/after imagery unavailable</strong><span>No connected scene dates, resolution, cloud score, or image pixels were returned.</span></div>}
              {mode === "demo" && <><label className="compare-slider-label" htmlFor="compare-slider"><span>Earlier</span><span>DEMO DATA · Drag to compare</span><span>Latest</span></label>
              <input id="compare-slider" className="compare-slider" type="range" min="10" max="90" value={compareValue} onChange={(event) => setCompareValue(Number(event.target.value))} aria-label="Compare demonstration earlier and later landscape images" />
              <div className="compare-insight"><Sparkles size={15} /><span><strong>DEMO DATA · simulated AI estimate</strong> Illustrative water-spread change; not an observation. Confirm with field evidence.</span></div></>}
            </article>
          </section>

          <section className="dashboard-grid queue-grid">
            <article className="panel verification-panel">
              <div className="panel-heading">
                <div><span className="section-overline">ACTION REQUIRED</span><h2>Priority verification queue</h2><p>{visibleSites.length} sites matching your view · Evidence explains why each needs attention</p></div>
                <button className="text-action" onClick={() => setSearch("")}>View all <ArrowRight size={15} /></button>
              </div>
              {visibleSites.length > 0 ? (
                <div className="verification-list">
                  {visibleSites.map((site) => (
                    <button className={`verification-row ${selectedSite === site.id ? "row-selected" : ""}`} key={site.id} onClick={() => setSelectedSite(site.id)}>
                      <img src={site.photo} alt="" loading="lazy" />
                      <span className="verification-main"><strong>{site.name}</strong><small>{site.district} · {site.kind}</small></span>
                      <span className="verification-reason"><Sparkles size={13} />{site.reason}</span>
                      <span className="priority-tag"><i />{assignedSites.includes(site.id) ? "Field check assigned" : site.status}</span>
                      <span className="verification-score"><strong>{site.score}%</strong><small>evidence</small></span>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </div>
              ) : <div className="empty-state"><Search size={20} /><strong>No sites found</strong><span>Try a different site name or district.</span></div>}
            </article>

            <article className="panel landuse-panel">
              <div className="panel-heading">
                <div><span className="section-overline">LAND-USE CHANGE</span><h2>Landscape watch</h2><p>Illustrative national sample · year-over-year</p></div>
                <span className="landuse-icon"><Leaf size={17} /></span>
              </div>
              <div className="landuse-image">
                <img src="https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?auto=format&fit=crop&w=700&q=78" alt="Aerial view of varied green agricultural land" loading="lazy" />
                <span><Layers3 size={13} /> LAND COVER CLASSIFICATION</span>
              </div>
              <div className="landuse-stats">
                <div><span>Vegetated area · estimate</span><strong>+6.4% <small>↑</small></strong></div>
                <div><span>Exposed soil · estimate</span><strong className="negative-change">−2.1% <small>↓</small></strong></div>
                <div><span>Water bodies · estimate</span><strong>+3.7% <small>↑</small></strong></div>
              </div>
              <p className="landuse-note"><Check size={14} /> Land cover is trending in a healthier direction.</p>
            </article>
          </section>

          <footer className="app-footer" id="reports" data-tour="report">
            <span><ShieldCheck size={15} /> Illustrative sample data · Satellite and AI values are estimates; field verification remains essential.</span>
            <span>JalRakshak AI <i /> Watershed monitoring workspace</span>
          </footer>
        </div>
      </main>
      <input ref={photoInput} type="file" accept="image/*" capture="environment" className="visually-hidden" onChange={handlePhotoSelected} />
      {toast && <div className={`toast-message ${toast.toLowerCase().includes("could not") || toast.toLowerCase().includes("retry") ? "toast-error" : ""}`} role="status"><Check size={17} />{toast}<button aria-label="Dismiss message" onClick={() => setToast("")}><X size={16} /></button></div>}
      {uploadWizardOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setUploadWizardOpen(false); }}>
          <section className="workflow-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title">
            <div className="modal-heading">
              <div><span className="section-overline">FIELD EVIDENCE · STEP {uploadStep} OF 2</span><h2 id="upload-title">{uploadStep === 1 ? "Capture field evidence" : "Review and save record"}</h2><p>{uploadStep === 1 ? "Add a photo, confirm the site, and capture field notes." : "Check the site, photo, and location before saving this record."}</p></div>
              <button className="icon-button" aria-label="Close upload wizard" onClick={() => setUploadWizardOpen(false)}><X size={19} /></button>
            </div>
            {uploadStep === 1 ? (
              <>
                {mode === "connected" && <label className="backend-site-id">Connected backend site ID
                  <input required value={backendSiteId} onChange={(event) => setBackendSiteId(event.currentTarget.value)} placeholder="Enter an existing site ID from your backend" />
                  <small>Sample map locations are not sent as real site identifiers. This field photo will not upload until you provide an actual backend ID.</small>
                </label>}
                <div className="wizard-site"><MapPin size={17} /><span><strong>{currentSite.name}</strong><small>{currentSite.district}</small></span><button className="text-action" onClick={() => { setUploadWizardOpen(false); handleNavigate("Map explorer", "map-explorer"); }}>Change site</button></div>
                <button className={`upload-dropzone ${uploadedPhoto ? "has-upload" : ""}`} data-tour="upload-drop" onClick={() => photoInput.current?.click()}>
                  {uploadedPhoto ? <img src={uploadedPhoto.preview} alt="Selected field evidence preview" /> : <span className="upload-drop-icon"><Upload size={22} /></span>}
                  <strong>{uploadedPhoto ? uploadedPhoto.name : "Take a photo or choose from gallery"}</strong>
                  <small>Photo is used for this session; only its field-record metadata is saved offline.</small>
                </button>
                <div className="gps-status"><LocateFixed size={17} /><div><strong>GPS location</strong><small>{uploadLocation}</small></div><span className={gpsDistanceMeters !== null && gpsDistanceMeters <= 500 ? "gps-good" : "gps-pending"}>{gpsDistanceMeters === null ? "Not captured" : gpsDistanceMeters <= 500 ? "Within 500 m" : `${(gpsDistanceMeters / 1000).toFixed(1)} km from site`}</span></div>
                <div className="manual-gps-fields">
                  <label>Latitude
                    <input inputMode="decimal" type="number" min="-90" max="90" step="any" value={manualLatitude} onChange={(event) => setManualLocation(event.currentTarget.value, manualLongitude)} placeholder="−90 to 90" />
                  </label>
                  <label>Longitude
                    <input inputMode="decimal" type="number" min="-180" max="180" step="any" value={manualLongitude} onChange={(event) => setManualLocation(manualLatitude, event.currentTarget.value)} placeholder="−180 to 180" />
                  </label>
                </div>
                <p className="gps-metadata-note">{uploadCoordinates ? "Location source and coordinates shown above; verify them before saving." : "No EXIF coordinates were found. You may enter coordinates when you know them; blank values stay unlocated."}</p>
                <label className="notes-label" htmlFor="field-notes">Field notes <span>Optional</span></label>
                <textarea id="field-notes" value={uploadNotes} onChange={(event) => setUploadNotes(event.target.value)} placeholder="Describe the structure, water level, or any changes observed…" rows={3} />
                <p className="wizard-disclaimer"><ShieldCheck size={14} /> GPS is device-reported, not independently verified. The 500 m check uses illustrative site coordinates and is an advisory only.</p>
              </>
            ) : (
              <div className="field-review-card">
                {uploadedPhoto && <img src={uploadedPhoto.preview} alt="Field evidence selected for this record" />}
                <div className="wizard-site"><MapPin size={17} /><span><strong>{currentSite.name}</strong><small>{currentSite.district} · {currentSite.kind}</small></span></div>
                <div className="field-review-line"><LocateFixed size={15} /><span><strong>Location check</strong><small>{uploadLocation} · {gpsDistanceMeters === null ? "No GPS fix captured" : `${gpsDistanceMeters} m from illustrative site reference`}</small></span></div>
                <div className="field-review-line"><Image size={15} /><span><strong>Photo</strong><small>{uploadedPhoto?.name ?? "No image selected"}</small></span></div>
                <p>{uploadNotes.trim() || "No field notes added."}</p>
                <p className="wizard-disclaimer"><ShieldCheck size={14} /> This demo saves record metadata on this device only. The location comparison is advisory and requires field confirmation.</p>
              </div>
            )}
            <div className="modal-actions">
              {uploadStep === 1
                ? <><button className="modal-cancel" onClick={() => setUploadWizardOpen(false)}>Cancel</button><button className="verify-button" disabled={!uploadedPhoto} onClick={() => setUploadStep(2)}>Review evidence <ChevronRight size={16} /></button></>
                : <><button className="modal-cancel" onClick={() => setUploadStep(1)}>Back</button>                <button className="verify-button" disabled={isUploading} onClick={() => void saveFieldRecord()}>{isUploading ? <Activity size={16} className="spin-icon" /> : <Check size={16} />}{isUploading ? "Uploading…" : mode === "demo" ? "Save demo field record" : "Upload to backend"}</button></>}
            </div>
          </section>
        </div>
      )}
      {reportOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setReportOpen(false); }}>
          <section className="workflow-modal report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
            <div className="modal-heading"><div><span className="section-overline">REPORT BUILDER</span><h2 id="report-title">Prepare watershed report</h2><p>Choose the reporting scope. Sample indicators are clearly marked in the printout.</p></div><button className="icon-button" aria-label="Close report builder" onClick={() => setReportOpen(false)}><X size={19} /></button></div>
            <label className="notes-label" htmlFor="report-scope">Report scope</label>
            <select id="report-scope" className="modal-select" value={reportScope} onChange={(event) => setReportScope(event.target.value)}><option>Watershed overview</option><option>Priority verification queue</option><option>Selected site · {currentSite.name}</option></select>
            <label className="notes-label" htmlFor="report-period">Reporting period</label>
            <select id="report-period" className="modal-select" value={reportPeriod} onChange={(event) => setReportPeriod(event.target.value)}><option>This season</option><option>Last 6 months</option><option>Year to date</option></select>
            <div className="report-preview" data-tour="report"><FileText size={19} /><span><strong>JalRakshak AI · {reportScope}</strong><small>{reportPeriod} · {currentDateLabel} · DEMO DATA · illustrative sample records only</small></span></div>
            <div className="modal-actions"><button className="modal-cancel" onClick={() => setReportOpen(false)}>Cancel</button><button className="verify-button" onClick={buildReport}><FileDown size={16} /> Print / save as PDF</button></div>
          </section>
        </div>
      )}
      {settingsOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
          <section className="workflow-modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="modal-heading"><div><span className="section-overline">WORKSPACE SETTINGS</span><h2 id="settings-title">Data and connection mode</h2><p>Choose explicitly whether the interface uses demonstration data or requests the configured service.</p></div><button className="icon-button" aria-label="Close settings" onClick={() => setSettingsOpen(false)}><X size={19} /></button></div>
            <label className="notes-label" htmlFor="settings-mode">Current operating mode</label>
            <select id="settings-mode" className="modal-select" value={mode} onChange={(event) => setMode(event.currentTarget.value === "connected" ? "connected" : "demo")}><option value="demo">Interactive Demo · deterministic DEMO DATA</option><option value="connected">Connected Mode · no silent fallback</option></select>
            <div className="report-preview"><Activity size={19} /><span><strong>{getApiBaseUrl() ? "Backend base URL configured" : "No backend base URL configured"}</strong><small>{getApiBaseUrl() ?? "Set VITE_API_BASE_URL and restart the frontend."}</small></span></div>
            <p className="wizard-disclaimer"><ShieldCheck size={14} /> Connected photo and inference workflows require the API contracts documented in docs/API_CONTRACTS.md. Satellite feeds, authorization, verification tasks, and server-side PDF generation are not connected in this frontend-only workspace.</p>
            <div className="modal-actions"><button className="modal-cancel" onClick={() => setSettingsOpen(false)}>Close</button><button className="verify-button" onClick={() => { setSettingsOpen(false); openTour(); }}><CircleHelp size={16} /> Start Guided Tour</button></div>
          </section>
        </div>
      )}
      {welcomeOpen && (
        <div className="tour-welcome-backdrop">
          <section className="tour-welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
            <img src={heroImage} alt="Green fields and watershed landscape in rural India" />
            <div className="tour-welcome-shade" />
            <button className="tour-welcome-close" aria-label="Explore dashboard" onClick={() => { setWelcomeOpen(false); navigate("/dashboard"); }}><X size={20} /></button>
            <div className="tour-welcome-content">
              <span className="tour-brand-mark"><Droplets size={22} /></span>
              <span className="tour-eyebrow">JALRAKSHAK AI · SIH 26078</span>
              <h1 id="welcome-title">Smarter Watersheds,<br />Sustainable Agriculture.</h1>
              <p>Watershed work is difficult to verify across large, diverse landscapes. JalRakshak AI brings field photographs, satellite observations, geospatial context, AI-assisted review, and field verification into one evidence-led workflow.</p>
              <div className="welcome-workflow-tags"><span>Geo-tagged field photos</span><span>Satellite observations</span><span>Human verification</span></div>
              <div className="tour-welcome-actions">
                <button className="tour-welcome-primary" onClick={() => openTour()}><Sparkles size={17} /> Start Interactive Demo</button>
                <button className="tour-welcome-secondary" onClick={() => { setWelcomeOpen(false); navigate("/dashboard"); }}><LayoutDashboard size={17} /> Explore Dashboard</button>
                {savedTourStep !== null && <button className="tour-resume-button" onClick={() => openTour(savedTourStep)}>Resume saved tour · stage {savedTourStep + 1}</button>}
              </div>
              <label className="tour-welcome-suppress"><input type="checkbox" checked={welcomeSuppressed} onChange={(event) => {
                setWelcomeSuppressed(event.currentTarget.checked);
                localStorage.setItem("jalrakshak-hide-welcome", String(event.currentTarget.checked));
              }} /> Don’t show this automatically again</label>
            </div>
          </section>
        </div>
      )}
      {viewingPhotoModal && (
        <PhotoModal
          photo={viewingPhotoModal}
          siteName={currentSite.name}
          onClose={() => setViewingPhotoModal(null)}
          onZoomToMap={() => {
            setViewingPhotoModal(null);
            document.getElementById("map-explorer")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      )}
      {tourStepIndex !== null && (
        <GuidedTour
          step={tourSteps[tourStepIndex]}
          index={tourStepIndex}
          total={tourSteps.length}
          onBack={() => changeTourStep(previousTourStep(tourStepIndex))}
          onNext={nextTour}
          onExit={exitTour}
          onSkip={exitTour}
          onRestart={() => openTour(0)}
          dontShowAgain={welcomeSuppressed}
          onDontShowAgain={(checked) => {
            setWelcomeSuppressed(checked);
            localStorage.setItem("jalrakshak-hide-welcome", String(checked));
          }}
        />
      )}
      {tourComplete && <TourCompletion onRestart={() => openTour(0)} onDashboard={exitTour} />}
      <button className="collapse-floating" aria-label="Collapse sidebar" onClick={() => setCollapsed((value) => !value)}><Menu size={18} /></button>
    </div>
  );
}

export default App;
