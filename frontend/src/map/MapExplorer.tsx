import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  ArrowLeft,
  Layers,
  Map as MapIcon,
  Compass,
  CheckCircle2,
  Info,
  Maximize2,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { MapCanvas } from "./MapCanvas";
import { BasemapSwitcher } from "./BasemapSwitcher";
import { LayerControl } from "./LayerControl";
import { MapLegend } from "./MapLegend";
import { GeographicSearch } from "./GeographicSearch";
import { FeatureDetails } from "./FeatureDetails";
import { MapToolbar } from "./MapToolbar";
import { MapLoadingState } from "./MapLoadingState";
import {
  MapLayerItem,
  BasemapStyle,
  FeatureDetail,
  SearchResultItem,
  QuickRegionPreset
} from "./mapTypes";
import {
  fetchMapLayers,
  fetchAdministrativeBoundaries,
  fetchWatershedBoundaries,
  fetchHydrology,
  fetchInterventions,
  fetchFeatureDetails,
  FALLBACK_LAYERS
} from "./mapApi";

interface MapExplorerProps {
  onBackToDashboard?: () => void;
  onLaunchSatelliteChange?: (waterbodyId: string) => void;
}

const REGION_PRESETS: QuickRegionPreset[] = [
  {
    id: "all-india",
    label: "All India",
    center: [80.9462, 23.5937],
    zoom: 4.8,
    description: "National watershed basins and state boundaries"
  },
  {
    id: "bihar-patna",
    label: "Patna, Bihar",
    center: [85.1376, 25.5941],
    zoom: 10.5,
    description: "Lower Ganga-Punpun watershed & urban wetlands"
  },
  {
    id: "rajasthan-barmer",
    label: "Barmer, Rajasthan",
    center: [71.38, 25.75],
    zoom: 9.2,
    description: "Luni basin & arid water harvesting structures"
  },
  {
    id: "assam-darrang",
    label: "Darrang, Assam",
    center: [92.02, 26.45],
    zoom: 9.5,
    description: "Brahmaputra north bank alluvial wetland basin"
  },
  {
    id: "karnataka-kolar",
    label: "Kolar, Karnataka",
    center: [78.13, 13.14],
    zoom: 10.0,
    description: "Palar basin cascade tanks & percolation structures"
  }
];

export const MapExplorer: React.FC<MapExplorerProps> = ({
  onBackToDashboard,
  onLaunchSatelliteChange
}) => {
  // Layer & Basemap States
  const [layers, setLayers] = useState<MapLayerItem[]>(FALLBACK_LAYERS);
  const [activeBasemap, setActiveBasemap] = useState<BasemapStyle>("streets");
  const [isLayerControlOpen, setIsLayerControlOpen] = useState(true);

  // Map Camera State
  const [zoom, setZoom] = useState(4.8);
  const [pitch, setPitch] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [cursorCoords, setCursorCoords] = useState<[number, number] | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Navigation & Selection
  const [navigationTarget, setNavigationTarget] = useState<{
    center: [number, number];
    zoom: number;
    bounds?: [[number, number], [number, number]];
  } | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<FeatureDetail | null>(null);
  const [activePreset, setActivePreset] = useState<string>("all-india");

  // Geospatial Datasets
  const [administrativeData, setAdministrativeData] = useState<any>(null);
  const [watershedsData, setWatershedsData] = useState<any>(null);
  const [hydrologyData, setHydrologyData] = useState<any>(null);
  const [interventionsData, setInterventionsData] = useState<any>(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);

  // Load GIS layers and datasets
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [layerItems, admin, ws, hydro, interv] = await Promise.allSettled([
        fetchMapLayers(),
        fetchAdministrativeBoundaries("all"),
        fetchWatershedBoundaries(),
        fetchHydrology("all"),
        fetchInterventions()
      ]);

      if (layerItems.status === "fulfilled" && layerItems.value.length > 0) {
        setLayers(layerItems.value);
      }
      if (admin.status === "fulfilled") setAdministrativeData(admin.value);
      if (ws.status === "fulfilled") setWatershedsData(ws.value);
      if (hydro.status === "fulfilled") setHydrologyData(hydro.value);
      if (interv.status === "fulfilled") setInterventionsData(interv.value);
    } catch (err: any) {
      setError(err?.message || "Failed to load remote GIS datasets.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Layer Toggling
  const handleToggleLayer = (id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleOpacityChange = (id: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l))
    );
  };

  const handleResetVisibility = () => {
    setLayers((prev) =>
      prev.map((l) => ({ ...l, visible: l.default_visible, opacity: 0.9 }))
    );
  };

  // Preset Selection
  const handleSelectPreset = (preset: QuickRegionPreset) => {
    setActivePreset(preset.id);
    setNavigationTarget({
      center: preset.center,
      zoom: preset.zoom,
      bounds: preset.bounds
    });
  };

  // Search Selection
  const handleSelectSearchResult = async (result: SearchResultItem) => {
    setNavigationTarget({
      center: result.center,
      zoom: result.zoom,
      bounds: result.bounds
    });

    // Fetch feature details if available
    if (result.feature_type && result.id) {
      const details = await fetchFeatureDetails(result.feature_type, result.id);
      if (details) {
        setSelectedFeature(details);
        return;
      }
    }

    // Otherwise construct feature detail from search result
    setSelectedFeature({
      id: result.id,
      name: result.title,
      type: result.category,
      category: result.category,
      center: result.center,
      latitude: result.center[1],
      longitude: result.center[0],
      source: "Geographic Search Service",
      can_launch_satellite_change: result.category === "waterbody"
    });
  };

  // Map Controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn({ duration: 300 });
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut({ duration: 300 });
    }
  };

  const handleResetView = () => {
    const allIndia = REGION_PRESETS[0];
    handleSelectPreset(allIndia);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 800
      });
    }
  };

  const handleToggle3D = () => {
    if (!mapInstanceRef.current) return;
    const nextPitch = pitch > 10 ? 0 : 45;
    mapInstanceRef.current.easeTo({
      pitch: nextPitch,
      duration: 800
    });
  };

  const handleResetBearing = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.easeTo({
      bearing: 0,
      duration: 600
    });
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Feature drawer zoom-to
  const handleZoomToFeature = (feature: FeatureDetail) => {
    if (feature.center) {
      setNavigationTarget({
        center: feature.center,
        zoom: feature.type === "state" ? 6.5 : feature.type === "watershed" ? 10.5 : 14.5
      });
    }
  };

  // Calculate active feature counts
  const totalWaterbodies = hydrologyData?.features?.filter((f: any) => f.properties?.type === "waterbody")?.length || 15;
  const totalInterventions = interventionsData?.features?.length || 5;

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col w-full h-[calc(100vh-4rem)] min-h-[640px] bg-slate-950 text-slate-100 overflow-hidden font-sans select-none"
    >
      {/* 1. Header Toolbar */}
      <header className="z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition-colors shadow-sm"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <MapIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-100 tracking-tight">
                  Interactive Watershed Map Explorer
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-full">
                  <Sparkles className="w-2.5 h-2.5" />
                  GIS Layer Engine v2
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Administrative, Hydrological &amp; Conservation Intervention GIS Visualization
              </p>
            </div>
          </div>
        </div>

        {/* Quick Region Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
          <span className="text-[11px] font-medium text-slate-400 mr-1 hidden md:inline">
            Focus:
          </span>
          {REGION_PRESETS.map((preset) => {
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all shrink-0 ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                    : "bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/60"
                }`}
                title={preset.description}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* 2. Main Map Workspace */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Map Canvas */}
        <MapCanvas
          basemap={activeBasemap}
          layers={layers}
          selectedFeature={selectedFeature}
          onSelectFeature={setSelectedFeature}
          onCursorMove={setCursorCoords}
          onMapStateChange={({ zoom, pitch, bearing }) => {
            setZoom(zoom);
            setPitch(pitch);
            setBearing(bearing);
          }}
          administrativeData={administrativeData}
          watershedsData={watershedsData}
          hydrologyData={hydrologyData}
          interventionsData={interventionsData}
          navigationTarget={navigationTarget}
          mapInstanceRef={mapInstanceRef}
        />

        {/* Top-Left: Search Bar */}
        <div className="absolute top-4 left-4 z-10 w-full max-w-xs sm:max-w-sm pointer-events-auto">
          <GeographicSearch onSelectResult={handleSelectSearchResult} />
        </div>

        {/* Left Side: Layer Control Accordion */}
        <div className="absolute top-20 left-4 z-10 pointer-events-auto">
          <LayerControl
            layers={layers}
            onToggleLayer={handleToggleLayer}
            onOpacityChange={handleOpacityChange}
            onResetVisibility={handleResetVisibility}
            isOpen={isLayerControlOpen}
            onToggleOpen={() => setIsLayerControlOpen(!isLayerControlOpen)}
          />
        </div>

        {/* Bottom-Left: Basemap Switcher & Legend */}
        <div className="absolute bottom-6 left-4 z-10 flex flex-col gap-3 pointer-events-auto">
          <BasemapSwitcher
            activeBasemap={activeBasemap}
            onChangeBasemap={setActiveBasemap}
          />
          <MapLegend layers={layers} />
        </div>

        {/* Right Side: Map Action Toolbar */}
        <div className="absolute top-4 right-4 z-10">
          <MapToolbar
            zoom={zoom}
            pitch={pitch}
            bearing={bearing}
            cursorCoords={cursorCoords}
            isFullscreen={isFullscreen}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetView={handleResetView}
            onToggleFullscreen={handleToggleFullscreen}
            onToggle3D={handleToggle3D}
            onResetBearing={handleResetBearing}
            onToggleLayerControl={() => setIsLayerControlOpen(!isLayerControlOpen)}
            isLayerControlOpen={isLayerControlOpen}
          />
        </div>

        {/* Feature Details Slide-Over Drawer */}
        <FeatureDetails
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
          onZoomToFeature={handleZoomToFeature}
          onLaunchSatelliteChange={onLaunchSatelliteChange}
        />

        {/* Loading / Error Overlay */}
        <MapLoadingState
          isLoading={isLoading}
          error={error}
          onRetry={loadData}
          message="Loading GIS watershed &amp; hydrological layers..."
        />
      </div>
    </div>
  );
};

export default MapExplorer;
