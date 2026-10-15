import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import {
  fetchWaterbodies,
  fetchWaterbodiesSummary,
  fetchWaterbodyHistory,
} from "./api";
import {
  type WaterbodyItem,
  type WaterbodyHistory,
  type WaterbodySummary,
  type InspectionStatus,
  type PriorityLevel,
  type WaterbodyType,
} from "./patnaWaterbodiesData";
import {
  Search,
  Filter,
  Layers,
  MapPin,
  Waves,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Wrench,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Maximize2,
  Minimize2,
  Calendar,
  User,
  Camera,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Info,
  CheckCircle2,
  SlidersHorizontal,
  Compass,
  ArrowUpDown,
  FileText,
  BadgeAlert,
  Sparkles,
  Eye,
  Database,
  Satellite
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";

// Default coordinates for Patna, Bihar, India
const PATNA_CENTER: [number, number] = [85.1376, 25.5941];
const PATNA_BOUNDS: [[number, number], [number, number]] = [
  [85.0000, 25.4800], // Southwest
  [85.3800, 25.6800], // Northeast
];

const STATUS_CONFIG: Record<
  InspectionStatus,
  { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }
> = {
  verified: {
    label: "Verified",
    color: "#10b981", // Emerald
    bg: "rgba(16, 185, 129, 0.15)",
    border: "#10b981",
    icon: ShieldCheck,
  },
  action_required: {
    label: "Action Required",
    color: "#f43f5e", // Rose/Red
    bg: "rgba(244, 63, 94, 0.15)",
    border: "#f43f5e",
    icon: AlertTriangle,
  },
  restoration_in_progress: {
    label: "Restoration in Progress",
    color: "#06b6d4", // Cyan
    bg: "rgba(6, 182, 212, 0.15)",
    border: "#06b6d4",
    icon: Wrench,
  },
  pending: {
    label: "Pending Inspection",
    color: "#a855f7", // Violet
    bg: "rgba(168, 85, 247, 0.15)",
    border: "#a855f7",
    icon: Clock,
  },
  not_inspected: {
    label: "Not Inspected",
    color: "#94a3b8", // Slate
    bg: "rgba(148, 163, 184, 0.15)",
    border: "#94a3b8",
    icon: HelpCircle,
  },
};

const PRIORITY_BADGES: Record<PriorityLevel, { label: string; className: string }> = {
  high: { label: "High Priority", className: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
  medium: { label: "Medium", className: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  low: { label: "Low", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
};

interface WaterbodyExplorerProps {
  onBackToDashboard?: () => void;
  onLaunchChangeDetection?: (waterbodyId: string) => void;
}

export default function WaterbodyExplorer({ onBackToDashboard, onLaunchChangeDetection }: WaterbodyExplorerProps) {
  // State
  const [waterbodies, setWaterbodies] = useState<WaterbodyItem[]>([]);
  const [summary, setSummary] = useState<WaterbodySummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "priority" | "area" | "last_inspected">("priority");

  // Selection & Detail Drawer
  const [selectedWaterbody, setSelectedWaterbody] = useState<WaterbodyItem | null>(null);
  const [historyData, setHistoryData] = useState<WaterbodyHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<"overview" | "history" | "measurements" | "restoration">("overview");

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [mapStyle, setMapStyle] = useState<"satellite" | "streets" | "dark" | "topo">("satellite");
  const [showPolygons, setShowPolygons] = useState<boolean>(true);
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [comparisonMode, setComparisonMode] = useState<boolean>(false);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);

  // Mapbox Token if configured
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  // 1. Fetch Waterbodies & Summary
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wbRes, sumRes] = await Promise.all([
        fetchWaterbodies({ district: "Patna", limit: 100 }),
        fetchWaterbodiesSummary("Patna"),
      ]);
      setWaterbodies(wbRes.items);
      setSummary(sumRes);
    } catch (err: any) {
      console.error("Failed to load Patna waterbodies:", err);
      setError("Unable to retrieve live waterbody records from server. Fallback demo data loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Load History when selectedWaterbody changes
  useEffect(() => {
    if (!selectedWaterbody) {
      setHistoryData(null);
      return;
    }
    let isCancelled = false;
    setHistoryLoading(true);

    fetchWaterbodyHistory(selectedWaterbody.id)
      .then((hist) => {
        if (!isCancelled) {
          setHistoryData(hist);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch history:", err);
      })
      .finally(() => {
        if (!isCancelled) setHistoryLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedWaterbody]);

  // 3. Filtered & Sorted Waterbody List
  const filteredWaterbodies = useMemo(() => {
    return waterbodies.filter((wb) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = wb.name.toLowerCase().includes(q);
        const matchesId = wb.id.toLowerCase().includes(q);
        const matchesType = wb.waterbody_type.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesType) return false;
      }
      // Status
      if (selectedStatus !== "all" && wb.inspection_status !== selectedStatus) {
        return false;
      }
      // Priority
      if (selectedPriority !== "all" && wb.priority !== selectedPriority) {
        return false;
      }
      // Type
      if (selectedType !== "all" && wb.waterbody_type !== selectedType) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "priority") {
        const order: Record<PriorityLevel, number> = { high: 3, medium: 2, low: 1 };
        return order[b.priority] - order[a.priority];
      }
      if (sortBy === "area") {
        return (b.area_hectares || 0) - (a.area_hectares || 0);
      }
      if (sortBy === "last_inspected") {
        if (!a.last_inspected_at) return 1;
        if (!b.last_inspected_at) return -1;
        return new Date(b.last_inspected_at).getTime() - new Date(a.last_inspected_at).getTime();
      }
      return 0;
    });
  }, [waterbodies, searchQuery, selectedStatus, selectedPriority, selectedType, sortBy]);

  // 4. Initialize MapLibre GL Map centered on Patna
  useEffect(() => {
    let mapInstance: MapLibreMap | null = null;
    let isDisposed = false;

    async function initMap() {
      if (!mapContainerRef.current || mapRef.current) return;

      const { Map, NavigationControl, AttributionControl, setWorkerUrl } = await import("maplibre-gl");
      setWorkerUrl(maplibreWorkerUrl);

      // Select tile URL based on mapStyle & token
      let tileUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      if (mapboxToken) {
        if (mapStyle === "satellite") tileUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}?access_token=${mapboxToken}`;
        else if (mapStyle === "streets") tileUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}?access_token=${mapboxToken}`;
        else if (mapStyle === "dark") tileUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}?access_token=${mapboxToken}`;
        else if (mapStyle === "topo") tileUrl = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/256/{z}/{x}/{y}?access_token=${mapboxToken}`;
      } else {
        if (mapStyle === "streets") tileUrl = "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png";
        else if (mapStyle === "dark") tileUrl = "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png";
        else if (mapStyle === "topo") tileUrl = "https://tile.opentopomap.org/{z}/{x}/{y}.png";
      }

      const styleSpec: any = {
        version: 8,
        sources: {
          "basemap-tiles": {
            type: "raster",
            tiles: [tileUrl],
            tileSize: 256,
            attribution: mapboxToken ? "© Mapbox © OpenStreetMap" : "© Esri / CARTO / OpenStreetMap",
          },
        },
        layers: [
          {
            id: "basemap-layer",
            type: "raster",
            source: "basemap-tiles",
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      };

      mapInstance = new Map({
        container: mapContainerRef.current,
        style: styleSpec,
        center: PATNA_CENTER,
        zoom: 12.2,
        minZoom: 10,
        maxZoom: 18,
        attributionControl: false,
      });

      mapInstance.addControl(new NavigationControl({ showCompass: true }), "top-right");
      mapInstance.addControl(new AttributionControl({ compact: true }), "bottom-right");

      mapInstance.on("load", () => {
        if (isDisposed || !mapInstance) return;
        mapRef.current = mapInstance;
        renderMapFeatures(mapInstance, filteredWaterbodies);
      });
    }

    initMap();

    return () => {
      isDisposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapStyle]);

  // 5. Update Map Features & Markers whenever waterbodies or filters change
  const renderMapFeatures = useCallback((map: MapLibreMap, items: WaterbodyItem[]) => {
    if (!map || !map.isStyleLoaded()) return;

    // Clear existing HTML markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Construct GeoJSON FeatureCollection for polygons
    const polygonFeatures: any[] = [];

    items.forEach((wb) => {
      if (wb.has_polygon && wb.boundary) {
        polygonFeatures.push({
          type: "Feature",
          id: wb.id,
          properties: {
            id: wb.id,
            name: wb.name,
            status: wb.inspection_status,
            color: STATUS_CONFIG[wb.inspection_status]?.color || "#3b82f6",
            priority: wb.priority,
            area_ha: wb.area_hectares || 0,
            type: wb.waterbody_type,
          },
          geometry: wb.boundary,
        });
      }
    });

    const geojsonData: any = {
      type: "FeatureCollection",
      features: polygonFeatures,
    };

    // Update or Add Source
    if (map.getSource("patna-waterbodies-poly")) {
      (map.getSource("patna-waterbodies-poly") as any).setData(geojsonData);
    } else {
      map.addSource("patna-waterbodies-poly", {
        type: "geojson",
        data: geojsonData,
      });

      // Fill Layer
      map.addLayer({
        id: "patna-waterbodies-fill",
        type: "fill",
        source: "patna-waterbodies-poly",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.65,
            0.4,
          ],
        },
      });

      // Outline Layer
      map.addLayer({
        id: "patna-waterbodies-outline",
        type: "line",
        source: "patna-waterbodies-poly",
        paint: {
          "line-color": ["get", "color"],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            3.5,
            2,
          ],
        },
      });

      // Interactive Click on Polygons
      map.on("click", "patna-waterbodies-fill", (e) => {
        if (e.features && e.features[0]) {
          const clickedId = e.features[0].properties.id;
          const found = items.find((w) => w.id === clickedId);
          if (found) {
            handleSelectWaterbody(found);
          }
        }
      });

      // Hover Pointer Cursor
      map.on("mouseenter", "patna-waterbodies-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "patna-waterbodies-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    }

    // Add Interactive Point Markers for all locations (especially for those without polygons)
    import("maplibre-gl").then(({ Marker, Popup }) => {
      items.forEach((wb) => {
        const statusConfig = STATUS_CONFIG[wb.inspection_status];
        const isPointOnly = !wb.has_polygon;

        // Custom marker DOM element
        const el = document.createElement("div");
        el.className = "waterbody-custom-marker";
        el.style.width = isPointOnly ? "28px" : "22px";
        el.style.height = isPointOnly ? "28px" : "22px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = statusConfig.color;
        el.style.border = isPointOnly ? "3px solid #ffffff" : "2px solid rgba(255,255,255,0.8)";
        el.style.boxShadow = `0 0 10px ${statusConfig.color}88, 0 2px 4px rgba(0,0,0,0.5)`;
        el.style.cursor = "pointer";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.transition = "transform 0.2s ease, box-shadow 0.2s ease";

        if (isPointOnly) {
          // Special inner icon for point-only marker
          el.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
        }

        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.35)";
          el.style.boxShadow = `0 0 16px ${statusConfig.color}, 0 4px 8px rgba(0,0,0,0.6)`;
        });
        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1.0)";
          el.style.boxShadow = `0 0 10px ${statusConfig.color}88, 0 2px 4px rgba(0,0,0,0.5)`;
        });

        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          handleSelectWaterbody(wb);
        });

        // Hover tooltip popup
        const popup = new Popup({ offset: 15, closeButton: false }).setHTML(`
          <div style="font-family: system-ui, sans-serif; padding: 4px; color: #0f172a;">
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">${wb.name}</div>
            <div style="font-size: 11px; color: #475569;">${wb.waterbody_type.toUpperCase()} • ${wb.area_hectares ? wb.area_hectares + " ha" : "Area unverified"}</div>
            <div style="font-size: 11px; margin-top: 4px; font-weight: 600; color: ${statusConfig.color};">${statusConfig.label}</div>
          </div>
        `);

        const markerInstance = new Marker({ element: el })
          .setLngLat([wb.longitude, wb.latitude])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(markerInstance);
      });
    });
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      renderMapFeatures(mapRef.current, filteredWaterbodies);
    }
  }, [filteredWaterbodies, renderMapFeatures]);

  // 6. Handle selection of a waterbody (fly to location & open drawer)
  const handleSelectWaterbody = (wb: WaterbodyItem) => {
    setSelectedWaterbody(wb);

    if (mapRef.current) {
      if (wb.has_polygon && wb.boundary && wb.boundary.coordinates) {
        // Calculate bounding box of polygon to fit bounds
        const coords = (wb.boundary.type === "Polygon" ? wb.boundary.coordinates[0] : wb.boundary.coordinates[0][0]) as number[][];
        if (coords && coords.length > 0) {
          let minX = coords[0][0], maxX = coords[0][0], minY = coords[0][1], maxY = coords[0][1];
          coords.forEach(([x, y]) => {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          });
          mapRef.current.fitBounds([[minX, minY], [maxX, maxY]], {
            padding: { top: 60, bottom: 60, left: sidebarOpen ? 380 : 60, right: 420 },
            duration: 1200,
            maxZoom: 16.5,
          });
          return;
        }
      }

      // Fallback fly to coordinate
      mapRef.current.flyTo({
        center: [wb.longitude, wb.latitude],
        zoom: 15.5,
        speed: 1.2,
      });
    }
  };

  // Re-center on Patna
  const handleResetMap = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: PATNA_CENTER,
        zoom: 12.2,
        speed: 1.2,
      });
    }
  };

  return (
    <div className="relative flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="z-20 flex items-center justify-between px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition flex items-center gap-1.5"
            >
              <ChevronLeft size={15} /> Dashboard
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-tr from-cyan-500 to-teal-400 rounded-lg shadow-md shadow-cyan-500/20 text-slate-950 font-bold">
              <Waves size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-bold tracking-tight text-white">
                  Waterbody Explorer
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-cyan-950 text-cyan-400 border border-cyan-800/80 rounded-full">
                  Patna, Bihar
                </span>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 rounded">
                  15 Ground Truth Sites
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center / Right stats & quick actions */}
        <div className="flex items-center gap-2">
          {/* Basemap switcher */}
          <div className="hidden lg:flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700 text-xs">
            {(["satellite", "streets", "topo", "dark"] as const).map((style) => (
              <button
                key={style}
                onClick={() => setMapStyle(style)}
                className={`px-2.5 py-1 rounded-md capitalize transition font-medium ${
                  mapStyle === style
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {style}
              </button>
            ))}
          </div>

          <button
            onClick={handleResetMap}
            title="Reset Map to Patna"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <Compass size={18} />
          </button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-1.5 rounded-lg border transition flex items-center gap-1 text-xs font-medium ${
              sidebarOpen
                ? "bg-slate-800 text-cyan-400 border-cyan-500/40"
                : "bg-slate-900 text-slate-300 border-slate-700"
            }`}
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">{sidebarOpen ? "Hide Filter" : "Filters"}</span>
          </button>
        </div>
      </header>

      {/* ── Main Viewport (Sidebar + Map + Detail Drawer) ─────────────────── */}
      <div className="relative flex flex-1 w-full h-[calc(100vh-50px)] overflow-hidden">
        {/* ── Collapsible Left Sidebar ───────────────────────────────────── */}
        <aside
          className={`z-10 absolute top-0 bottom-0 left-0 transition-all duration-300 ease-in-out flex flex-col bg-slate-900/95 border-r border-slate-800 backdrop-blur-md shadow-2xl ${
            sidebarOpen ? "w-80 md:w-96 translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Sidebar Top: Search & Quick Filters */}
          <div className="p-3 border-b border-slate-800/80 space-y-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by waterbody name or ID..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Status Filter Chips */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Inspection Status</span>
                <span className="text-slate-500">{filteredWaterbodies.length} of {waterbodies.length}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: "all", label: "All" },
                  { id: "action_required", label: "Action" },
                  { id: "restoration_in_progress", label: "Restoring" },
                  { id: "pending", label: "Pending" },
                  { id: "verified", label: "Verified" },
                  { id: "not_inspected", label: "Uninspected" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStatus(s.id)}
                    className={`px-2 py-0.5 text-[11px] rounded-md transition font-medium border ${
                      selectedStatus === s.id
                        ? "bg-cyan-600/30 text-cyan-300 border-cyan-500/60 shadow-sm"
                        : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority & Sort dropdowns */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-semibold mb-1 block">Priority</label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-md text-slate-200 text-xs focus:outline-none"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-400 font-semibold mb-1 block">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-md text-slate-200 text-xs focus:outline-none"
                >
                  <option value="priority">Priority Rank</option>
                  <option value="area">Surface Area</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="last_inspected">Inspection Date</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary KPIs banner */}
          {summary && (
            <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800/80 grid grid-cols-4 gap-1.5 text-center shrink-0">
              <div className="p-1 rounded bg-slate-800/50">
                <div className="text-[10px] text-slate-400">Total</div>
                <div className="text-xs font-bold text-white">{summary.total_waterbodies}</div>
              </div>
              <div className="p-1 rounded bg-rose-950/40 border border-rose-900/40">
                <div className="text-[10px] text-rose-400">Action</div>
                <div className="text-xs font-bold text-rose-300">{summary.by_status.action_required || 0}</div>
              </div>
              <div className="p-1 rounded bg-cyan-950/40 border border-cyan-900/40">
                <div className="text-[10px] text-cyan-400">Restoring</div>
                <div className="text-xs font-bold text-cyan-300">{summary.by_status.restoration_in_progress || 0}</div>
              </div>
              <div className="p-1 rounded bg-emerald-950/40 border border-emerald-900/40">
                <div className="text-[10px] text-emerald-400">Verified</div>
                <div className="text-xs font-bold text-emerald-300">{summary.by_status.verified || 0}</div>
              </div>
            </div>
          )}

          {/* Waterbodies Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 p-2 space-y-1">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="animate-spin text-cyan-400" size={24} />
                <span className="text-xs">Loading Patna waterbody inventory...</span>
              </div>
            ) : filteredWaterbodies.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400">
                <HelpCircle className="mx-auto mb-2 text-slate-500" size={28} />
                <p className="text-xs font-semibold text-slate-300">No matching waterbodies</p>
                <p className="text-[11px] text-slate-500 mt-1">Try adjusting your search terms or status filters.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedStatus("all");
                    setSelectedPriority("all");
                  }}
                  className="mt-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded-md text-cyan-400"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredWaterbodies.map((wb) => {
                const statusConfig = STATUS_CONFIG[wb.inspection_status];
                const priorityBadge = PRIORITY_BADGES[wb.priority];
                const isSelected = selectedWaterbody?.id === wb.id;
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={wb.id}
                    onClick={() => handleSelectWaterbody(wb)}
                    className={`p-2.5 rounded-lg transition cursor-pointer border ${
                      isSelected
                        ? "bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-950/50"
                        : "bg-slate-950/40 hover:bg-slate-800/50 border-slate-800/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: statusConfig.color }}
                          />
                          <h4 className="text-xs font-bold text-white truncate">{wb.name}</h4>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span className="uppercase text-[9px] font-mono tracking-wider text-slate-500">{wb.id}</span>
                          <span>•</span>
                          <span className="capitalize">{wb.waterbody_type}</span>
                          {wb.area_hectares && (
                            <>
                              <span>•</span>
                              <span className="text-cyan-300 font-medium">{wb.area_hectares} ha</span>
                            </>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border shrink-0 ${priorityBadge.className}`}
                      >
                        {wb.priority}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span
                        className="px-1.5 py-0.5 rounded font-medium flex items-center gap-1"
                        style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                      >
                        <StatusIcon size={11} /> {statusConfig.label}
                      </span>

                      <span className="text-slate-500 text-[10px]">
                        {wb.last_inspected_at
                          ? new Date(wb.last_inspected_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "No inspections recorded"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer info */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Patna Municipal & Wetland GIS</span>
            <span className="text-cyan-400 flex items-center gap-1">
              <Database size={11} /> Live Vector GIS
            </span>
          </div>
        </aside>

        {/* ── Center Map Container ────────────────────────────────────────── */}
        <div className="relative flex-1 h-full w-full">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

          {/* Map Overlay: Floating Legend */}
          <div className="absolute bottom-6 left-4 z-10 hidden sm:block p-3 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-xl text-xs max-w-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Layers size={13} className="text-cyan-400" /> Map Legend & Statuses
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-white/40"
                    style={{ backgroundColor: cfg.color }}
                  />
                  <span className="text-slate-300">{cfg.label}</span>
                </div>
              ))}
              <div className="pt-1.5 mt-1 border-t border-slate-800 text-[10px] text-slate-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full border border-white bg-slate-400 mr-1.5 align-middle" />
                Unverified Boundary (Point Marker)
              </div>
            </div>
          </div>
        </div>

        {/* ── Slide-Out Details Drawer (Right Side) ────────────────────────── */}
        {selectedWaterbody && (
          <aside className="z-20 absolute top-0 bottom-0 right-0 w-full sm:w-[420px] md:w-[480px] bg-slate-900/95 border-l border-slate-800 backdrop-blur-md shadow-2xl flex flex-col transition-all animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-slate-800 text-cyan-400 rounded border border-slate-700">
                    {selectedWaterbody.id}
                  </span>
                  <span
                    className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border ${
                      PRIORITY_BADGES[selectedWaterbody.priority].className
                    }`}
                  >
                    {selectedWaterbody.priority} Priority
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-1 leading-snug">{selectedWaterbody.name}</h2>
                <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <MapPin size={12} className="text-rose-400" />
                  <span>
                    Patna, Bihar ({selectedWaterbody.latitude.toFixed(4)}, {selectedWaterbody.longitude.toFixed(4)})
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedWaterbody(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Status Highlight Banner */}
            <div
              className="px-4 py-2 flex items-center justify-between text-xs border-b border-slate-800"
              style={{
                backgroundColor: STATUS_CONFIG[selectedWaterbody.inspection_status].bg,
                borderColor: `${STATUS_CONFIG[selectedWaterbody.inspection_status].color}33`,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_CONFIG[selectedWaterbody.inspection_status].color }}
                />
                <span
                  className="font-bold uppercase tracking-wide text-[11px]"
                  style={{ color: STATUS_CONFIG[selectedWaterbody.inspection_status].color }}
                >
                  {STATUS_CONFIG[selectedWaterbody.inspection_status].label}
                </span>
              </div>

              <span className="text-[11px] text-slate-300">
                {selectedWaterbody.area_hectares ? `${selectedWaterbody.area_hectares} hectares` : "Area unverified"}
              </span>
            </div>

            {/* Quick Action: Satellite Change Detection */}
            <div className="p-3 bg-slate-900/90 border-b border-slate-800">
              <button
                onClick={() => onLaunchChangeDetection?.(selectedWaterbody.id)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-950 transition-all active:scale-[0.98]"
              >
                <Satellite size={15} />
                <span>Satellite Change Detection (Sentinel-2 L2A)</span>
                <ChevronRight size={14} className="opacity-70" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/30 text-xs shrink-0">
              {[
                { id: "overview", label: "Overview" },
                { id: "history", label: "Inspections" },
                { id: "measurements", label: "Spread Trend" },
                { id: "restoration", label: "Restoration" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDrawerTab(tab.id as any)}
                  className={`flex-1 py-2 font-medium transition text-center border-b-2 ${
                    drawerTab === tab.id
                      ? "text-cyan-400 border-cyan-400 bg-slate-800/40"
                      : "text-slate-400 border-transparent hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Drawer Body Scroll */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* ── TAB 1: OVERVIEW ───────────────────────────────────────── */}
              {drawerTab === "overview" && (
                <div className="space-y-4 text-xs">
                  {/* Basic Information Card */}
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Info size={14} className="text-cyan-400" /> Basic Information
                    </h3>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Waterbody Type:</span>
                        <span className="font-semibold capitalize text-slate-200">{selectedWaterbody.waterbody_type}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Measured Area:</span>
                        <span className="font-semibold text-slate-200">
                          {selectedWaterbody.area_hectares ? `${selectedWaterbody.area_hectares} ha` : "Null (Pending Survey)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Boundary Status:</span>
                        <span className="font-semibold text-slate-200 flex items-center gap-1">
                          {selectedWaterbody.is_verified_boundary ? (
                            <span className="text-emerald-400 flex items-center gap-0.5">
                              <CheckCircle2 size={12} /> Verified Polygon
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-0.5">
                              <AlertTriangle size={12} /> Point Marker Only
                            </span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Data Provenance:</span>
                        <span className="font-medium text-slate-300 truncate block" title={selectedWaterbody.data_source}>
                          {selectedWaterbody.data_source}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Priority & Justification Card */}
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-amber-400" /> Priority & Environmental Diagnosis
                    </h3>
                    <p className="text-[12px] text-slate-300 leading-relaxed">
                      {selectedWaterbody.priority_reason || "Environmental priority assigned based on municipal drainage importance."}
                    </p>
                  </div>

                  {/* Quick Status / Next Actions */}
                  <div className="p-3 bg-cyan-950/30 rounded-xl border border-cyan-800/40 space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-cyan-400" /> Recommended Interventions
                    </h3>
                    <p className="text-[11.5px] text-cyan-100/90 leading-relaxed">
                      {selectedWaterbody.inspection_status === "action_required"
                        ? "Immediate mechanical weed clearing, stormwater inlet screening, and boundary fencing recommended."
                        : selectedWaterbody.inspection_status === "restoration_in_progress"
                        ? "Ongoing bio-dredging and sediment trapping; maintain aeration schedule and track post-monsoon NDVI/NDWI."
                        : selectedWaterbody.inspection_status === "verified"
                        ? "Ecological condition healthy. Continue quarterly satellite surveillance and preserve riparian fringe."
                        : "Field inspection pending. Deploy local verification team with geotagged EXIF photo capture."}
                    </p>
                  </div>

                  {/* Field Photographs if available */}
                  {historyData?.photos && historyData.photos.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Camera size={14} className="text-cyan-400" /> Ground Truth Photographs
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {historyData.photos.map((p) => (
                          <div key={p.id} className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                            <img src={p.photo_url} alt={p.caption} className="w-full h-36 object-cover" />
                            <div className="p-2 text-[11px]">
                              <p className="font-medium text-slate-200">{p.caption}</p>
                              <div className="flex items-center justify-between text-slate-500 mt-1 text-[10px]">
                                <span>Captured by {p.photographer}</span>
                                <span className="text-emerald-400">EXIF Verified</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: INSPECTIONS HISTORY ────────────────────────────── */}
              {drawerTab === "history" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <h3 className="font-bold text-slate-300">Chronological Field Inspections</h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-amber-400 border border-slate-700 rounded">
                      DEMO SIMULATION
                    </span>
                  </div>

                  {historyLoading ? (
                    <div className="py-8 text-center text-slate-500 text-xs">Loading inspection records...</div>
                  ) : !historyData?.inspections || historyData.inspections.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/80 p-4">
                      <HelpCircle className="mx-auto mb-2 text-slate-500" size={24} />
                      <p className="text-xs font-semibold text-slate-300">No inspections on record</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        This site has not yet undergone field inspection. Records will appear once a field team completes verification.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {historyData.inspections.map((insp, idx) => (
                        <div
                          key={insp.id}
                          className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5 text-xs relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">
                              {new Date(insp.inspection_date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-cyan-300">
                              {insp.status.replace(/_/g, " ")}
                            </span>
                          </div>

                          <p className="text-slate-300 text-[11.5px] leading-relaxed">{insp.observations}</p>

                          {insp.recommended_action && (
                            <div className="p-2 bg-slate-900 rounded text-[11px] text-cyan-200/90 border-l-2 border-cyan-400">
                              <span className="font-semibold block text-[10px] uppercase text-cyan-400">Action Plan</span>
                              {insp.recommended_action}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-500">
                            <span>Officer: {insp.inspector_name} ({insp.inspector_role})</span>
                            <span className="text-emerald-400 font-mono">Confidence: {insp.confidence_score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 3: WATER-SPREAD AREA TREND CHART ─────────────────── */}
              {drawerTab === "measurements" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <h3 className="font-bold text-slate-300">Multi-Epoch Water-Spread Trend</h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-amber-400 border border-slate-700 rounded">
                      Sentinel-2 NDWI
                    </span>
                  </div>

                  {historyLoading ? (
                    <div className="py-8 text-center text-slate-500 text-xs">Loading satellite series...</div>
                  ) : !historyData?.measurements || historyData.measurements.length < 2 ? (
                    <div className="py-12 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/80 p-4">
                      <AlertTriangle className="mx-auto mb-2 text-amber-500" size={24} />
                      <p className="text-xs font-semibold text-slate-300">Insufficient historical measurements</p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                        At least 2 validated temporal measurements are required to calculate surface spread trend.
                        (Current valid observations: {historyData?.measurements?.length || 0}).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Interactive Recharts Area Chart */}
                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                        <div className="text-[11px] font-semibold text-slate-400 mb-2">
                          Water Surface Area Over Time (Hectares)
                        </div>
                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={historyData.measurements.map((m) => ({
                                date: new Date(m.measurement_date).toLocaleDateString("en-IN", {
                                  month: "short",
                                  day: "numeric",
                                }),
                                area: m.water_spread_area_ha,
                                source: m.source,
                              }))}
                              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="waterSpreadGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                              <YAxis stroke="#64748b" fontSize={10} domain={["auto", "auto"]} />
                              <RechartsTooltip
                                contentStyle={{
                                  backgroundColor: "#0f172a",
                                  borderColor: "#334155",
                                  borderRadius: "8px",
                                  fontSize: "11px",
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="area"
                                stroke="#06b6d4"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#waterSpreadGrad)"
                                name="Water-Spread (ha)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Measurements Table */}
                      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-semibold">
                            <tr>
                              <th className="p-2">Observation Date</th>
                              <th className="p-2">Area (ha)</th>
                              <th className="p-2">Sensor / Method</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-[11px]">
                            {historyData.measurements.map((m) => (
                              <tr key={m.id} className="hover:bg-slate-900/40">
                                <td className="p-2 text-slate-300">
                                  {new Date(m.measurement_date).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </td>
                                <td className="p-2 font-mono font-bold text-cyan-400">{m.water_spread_area_ha} ha</td>
                                <td className="p-2 text-slate-400">{m.source}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 4: RESTORATION INITIATIVES ────────────────────────── */}
              {drawerTab === "restoration" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <h3 className="font-bold text-slate-300">Restoration & Maintenance Activities</h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-cyan-400 border border-slate-700 rounded">
                      Jal-Jeevan-Hariyali
                    </span>
                  </div>

                  {!historyData?.restorations || historyData.restorations.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/80 p-4">
                      <Wrench className="mx-auto mb-2 text-slate-500" size={24} />
                      <p className="text-xs font-semibold text-slate-300">No active civil works recorded</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        No sanctioned desiltation or civil restoration projects are currently registered for this waterbody.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {historyData.restorations.map((r) => (
                        <div
                          key={r.id}
                          className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between">
                            <h4 className="font-bold text-white text-[12px]">{r.activity_type}</h4>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                r.status === "completed"
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                  : "bg-cyan-950 text-cyan-400 border border-cyan-800"
                              }`}
                            >
                              {r.status.replace(/_/g, " ")}
                            </span>
                          </div>

                          <p className="text-slate-300 text-[11.5px] leading-relaxed">{r.description}</p>

                          {r.outcome && (
                            <div className="p-2 bg-emerald-950/40 border border-emerald-800/40 rounded text-[11px] text-emerald-200">
                              <span className="font-bold block text-[10px] uppercase text-emerald-400">Measured Outcome</span>
                              {r.outcome}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-500">
                            <span>
                              Timeline: {new Date(r.start_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                              {r.completion_date && ` — ${new Date(r.completion_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`}
                            </span>
                            {r.budget_inr && (
                              <span className="text-slate-300 font-mono">
                                ₹{(r.budget_inr / 100000).toFixed(1)} Lakhs
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
