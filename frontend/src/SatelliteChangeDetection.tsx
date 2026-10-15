import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Waves,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Info,
  Maximize2,
  Eye,
  ShieldCheck,
  Compass,
  MapPin,
  ExternalLink,
  History,
  Sparkles,
  Split,
  Columns,
  Satellite,
  Clock,
  Radio,
  Gauge,
  Droplets,
  Activity,
  Cpu,
  AlertOctagon,
  CheckCircle,
  PlusCircle,
  BarChart3,
  Flame,
  Send
} from "lucide-react";
import { verifiedPatnaWaterbodies, WaterbodyItem } from "./patnaWaterbodiesData";
import {
  fetchSatelliteAvailability,
  runSatelliteChangeDetection,
  fetchSatelliteChangeHistory,
  getSatelliteChangePdfUrl,
  getSatelliteChangeCsvUrl,
  fetchSatelliteCronStatus,
  triggerSatelliteCronIngestion,
  executeSubPixelFusion,
  fetchBathymetryProfile,
  recordBathymetricReading,
  SatelliteAvailabilityData,
  SatelliteChangeResult,
  SatelliteChangeHistoryItem,
  SatelliteSceneItem,
  SatelliteCronStatus,
  SubPixelFusionResult,
  BathymetryProfileResult
} from "./api";

interface SatelliteChangeDetectionProps {
  initialWaterbodyId?: string;
  onBackToDashboard?: () => void;
  onNavigateToWaterbodyExplorer?: (waterbodyId?: string) => void;
}

export default function SatelliteChangeDetection({
  initialWaterbodyId,
  onBackToDashboard,
  onNavigateToWaterbodyExplorer,
}: SatelliteChangeDetectionProps) {
  // 1. Waterbody Selection
  const [selectedWbId, setSelectedWbId] = useState<string>(
    initialWaterbodyId || verifiedPatnaWaterbodies[0]?.id || "wb-patna-001"
  );

  const selectedWaterbody = useMemo<WaterbodyItem | undefined>(() => {
    return verifiedPatnaWaterbodies.find((w) => w.id === selectedWbId);
  }, [selectedWbId]);

  // 2. Satellite Scenes Availability
  const [availability, setAvailability] = useState<SatelliteAvailabilityData | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(false);

  // 3. Date Selection & Presets
  const [earlierDate, setEarlierDate] = useState<string>("2025-05-21");
  const [laterDate, setLaterDate] = useState<string>("2025-10-23");

  // 4. Algorithm Parameters
  const [ndwiThreshold, setNdwiThreshold] = useState<number>(0.0);
  const [tolerancePct, setTolerancePct] = useState<number>(3.0);
  const [minChangeHa, setMinChangeHa] = useState<number>(0.03);

  // 5. Analysis State
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<SatelliteChangeResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // 6. History
  const [historyItems, setHistoryItems] = useState<SatelliteChangeHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // 7. Interactive Viewer Mode
  const [viewMode, setViewMode] = useState<"side_by_side" | "swipe" | "diff_map" | "mask_only">("swipe");
  const [imageryLayer, setImageryLayer] = useState<"true_color" | "ndwi_mask">("true_color");
  const [swipePosition, setSwipePosition] = useState<number>(50); // percentage 0-100
  const isDraggingSwipe = useRef<boolean>(false);

  // 8. Main Tab Selection
  const [mainTab, setMainTab] = useState<"sentinel_change" | "subpixel_fusion" | "bathymetry_depth">("sentinel_change");

  // 9. Automated 5-Day Copernicus Cron Ingestion State
  const [cronStatus, setCronStatus] = useState<SatelliteCronStatus | null>(null);
  const [loadingCron, setLoadingCron] = useState<boolean>(false);
  const [triggeringCron, setTriggeringCron] = useState<boolean>(false);
  const [cronModalOpen, setCronModalOpen] = useState<boolean>(false);
  const [cronTriggerResult, setCronTriggerResult] = useState<any>(null);

  // 10. Sub-Pixel Hybrid Resolution Fusion State (3m Commercial / UAV)
  const [subpixelSensor, setSubpixelSensor] = useState<string>("PlanetScope 3m SuperDove");
  const [subpixelDate, setSubpixelDate] = useState<string>("2026-04-16");
  const [executingFusion, setExecutingFusion] = useState<boolean>(false);
  const [fusionResult, setFusionResult] = useState<SubPixelFusionResult | null>(null);
  const [fusionError, setFusionError] = useState<string | null>(null);
  const [fusionViewMode, setFusionViewMode] = useState<"subpixel_fraction" | "fused_rgb">("subpixel_fraction");

  // 11. Bathymetry & Water Depth Coupling State (Ultrasonic Ground-Truth)
  const [bathymetryData, setBathymetryData] = useState<BathymetryProfileResult | null>(null);
  const [loadingBathymetry, setLoadingBathymetry] = useState<boolean>(false);
  const [bathymetryError, setBathymetryError] = useState<string | null>(null);
  const [newDepthMeters, setNewDepthMeters] = useState<string>("2.10");
  const [newSensorId, setNewSensorId] = useState<string>("US-PATNA-09");
  const [newRecordedBy, setNewRecordedBy] = useState<string>("Officer R. Trivedi (Field Team 3)");
  const [submittingReading, setSubmittingReading] = useState<boolean>(false);
  const [readingSuccessMsg, setReadingSuccessMsg] = useState<string | null>(null);

  // Fetch Cron Ingestion Status on Mount
  useEffect(() => {
    let isCancelled = false;
    async function loadCron() {
      setLoadingCron(true);
      try {
        const st = await fetchSatelliteCronStatus();
        if (!isCancelled) setCronStatus(st);
      } catch (err) {
        console.warn("Could not fetch cron status", err);
      } finally {
        if (!isCancelled) setLoadingCron(false);
      }
    }
    loadCron();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Fetch scene availability when waterbody changes
  useEffect(() => {
    let isCancelled = false;
    async function loadAvailability() {
      setLoadingAvailability(true);
      setAnalysisError(null);
      try {
        const data = await fetchSatelliteAvailability(selectedWbId);
        if (!isCancelled) {
          setAvailability(data);
          if (data.recommended_pair) {
            setEarlierDate(data.recommended_pair.earlier_date);
            setLaterDate(data.recommended_pair.later_date);
          }
        }
      } catch (err) {
        console.warn("Could not fetch availability, fallback enabled", err);
      } finally {
        if (!isCancelled) setLoadingAvailability(false);
      }
    }

    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const res = await fetchSatelliteChangeHistory(selectedWbId);
        if (!isCancelled) {
          setHistoryItems(res.history || []);
        }
      } catch (err) {
        console.warn("Could not fetch change history", err);
      } finally {
        if (!isCancelled) setLoadingHistory(false);
      }
    }

    loadAvailability();
    loadHistory();
    return () => {
      isCancelled = true;
    };
  }, [selectedWbId]);

  // Execute Analysis
  const handleRunAnalysis = async () => {
    if (earlierDate >= laterDate) {
      setAnalysisError("Earlier observation date must be chronologically before the later date.");
      return;
    }
    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await runSatelliteChangeDetection(selectedWbId, {
        earlier_date: earlierDate,
        later_date: laterDate,
        ndwi_threshold: ndwiThreshold,
        tolerance_pct: tolerancePct,
        min_change_ha: minChangeHa,
        save_to_history: true,
      });
      setAnalysisResult(res);

      // Refresh history list
      fetchSatelliteChangeHistory(selectedWbId).then((h) => {
        setHistoryItems(h.history || []);
      });
    } catch (err: any) {
      setAnalysisError(
        err?.response?.data?.error?.message || err?.message || "Failed to execute satellite analysis. Please try again."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // Run initial analysis automatically on mount
  useEffect(() => {
    handleRunAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWbId]);

  // Mouse move for swipe comparison
  const handleSwipeMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingSwipe.current && e.type !== "touchmove") return;
    const container = e.currentTarget.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const offset = clientX - container.left;
    const pct = Math.max(0, Math.min(100, (offset / container.width) * 100));
    setSwipePosition(pct);
  };

  // Quick Seasonal Presets
  const applyPreset = (preset: "monsoon" | "yearly" | "recent") => {
    if (preset === "monsoon") {
      setEarlierDate("2025-05-21"); // Pre-monsoon dry
      setLaterDate("2025-10-23");  // Post-monsoon full
    } else if (preset === "yearly") {
      setEarlierDate("2025-03-22");
      setLaterDate("2026-03-27");
    } else if (preset === "recent") {
      setEarlierDate("2025-11-17");
      setLaterDate("2026-04-16");
    }
  };

  // Downloads
  const downloadPdf = () => {
    if (!analysisResult?.id) return;
    const url = getSatelliteChangePdfUrl(selectedWbId, analysisResult.id);
    window.open(url, "_blank");
  };

  const downloadCsv = () => {
    if (!analysisResult?.id) return;
    const url = getSatelliteChangeCsvUrl(selectedWbId, analysisResult.id);
    window.open(url, "_blank");
  };

  const classification = analysisResult?.classification || "stable";
  const isExpansion = classification === "expansion";
  const isShrinkage = classification === "shrinkage";
  const isInconclusive = classification === "inconclusive";

  // Trigger Immediate Copernicus Cron Ingestion Cycle
  const handleTriggerCron = async () => {
    setTriggeringCron(true);
    setCronTriggerResult(null);
    try {
      const res = await triggerSatelliteCronIngestion();
      setCronTriggerResult(res);
      const updated = await fetchSatelliteCronStatus();
      setCronStatus(updated);
    } catch (err) {
      console.warn("Failed to trigger cron cycle", err);
    } finally {
      setTriggeringCron(false);
    }
  };

  // Run 3m Sub-Pixel Hybrid Resolution Fusion
  const handleRunFusion = async () => {
    setExecutingFusion(true);
    setFusionError(null);
    try {
      const res = await executeSubPixelFusion(selectedWbId, {
        observation_date: subpixelDate,
        ndwi_threshold: ndwiThreshold,
        target_sensor: subpixelSensor,
      });
      setFusionResult(res);
    } catch (err: any) {
      setFusionError(err?.response?.data?.error?.message || err?.message || "Failed to execute sub-pixel fusion.");
    } finally {
      setExecutingFusion(false);
    }
  };

  // Fetch Bathymetry & Water Depth Profile
  const loadBathymetry = async () => {
    setLoadingBathymetry(true);
    setBathymetryError(null);
    try {
      const currentArea = (analysisResult?.later_area_ha ?? selectedWaterbody?.area_hectares) ?? undefined;
      const data = await fetchBathymetryProfile(selectedWbId, currentArea);
      setBathymetryData(data);
      if (data.coupled_metrics?.measured_depth_m) {
        setNewDepthMeters(data.coupled_metrics.measured_depth_m.toFixed(2));
      }
    } catch (err: any) {
      setBathymetryError(err?.response?.data?.error?.message || err?.message || "Failed to load bathymetry profile.");
    } finally {
      setLoadingBathymetry(false);
    }
  };

  // Auto-load bathymetry when tab or waterbody changes
  useEffect(() => {
    if (mainTab === "bathymetry_depth") {
      loadBathymetry();
    }
  }, [mainTab, selectedWbId, analysisResult?.later_area_ha]);

  // Auto-trigger fusion when switching to subpixel tab if not yet loaded for this waterbody
  useEffect(() => {
    if (mainTab === "subpixel_fusion" && (!fusionResult || fusionResult.waterbody_id !== selectedWbId)) {
      handleRunFusion();
    }
  }, [mainTab, selectedWbId]);

  // Submit Ultrasonic Depth Gauge Field Measurement
  const handleRecordDepth = async (e: React.FormEvent) => {
    e.preventDefault();
    const depth = parseFloat(newDepthMeters);
    if (isNaN(depth) || depth <= 0) {
      setBathymetryError("Please enter a valid positive depth in meters (e.g. 2.10).");
      return;
    }
    setSubmittingReading(true);
    setBathymetryError(null);
    setReadingSuccessMsg(null);
    try {
      const currentArea = analysisResult?.later_area_ha || selectedWaterbody?.area_hectares || 1.0;
      const res = await recordBathymetricReading(selectedWbId, {
        water_level_m: depth,
        sensor_id: newSensorId,
        sensor_type: "ultrasonic_ground_gauge",
        recorded_by: newRecordedBy,
        surface_area_ha: currentArea,
      });
      setReadingSuccessMsg(res.message || "Ultrasonic depth logged successfully. Basin volume updated.");
      await loadBathymetry();
      setTimeout(() => setReadingSuccessMsg(null), 6000);
    } catch (err: any) {
      setBathymetryError(err?.response?.data?.error?.message || err?.message || "Failed to log depth measurement.");
    } finally {
      setSubmittingReading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-3 sm:p-6 lg:p-8">
      {/* Top Breadcrumb & Navigation Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
            title="Return to main dashboard"
          >
            <ChevronLeft size={16} />
            <span>Dashboard</span>
          </button>
          <div className="h-4 w-px bg-slate-800 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Satellite size={18} />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Satellite Change Detection
              </h1>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                Sentinel-2 L2A · 10m
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-temporal Normalized Difference Water Index (NDWI) surface water spread & shrinkage analysis for Patna, Bihar
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Automated 5-Day Copernicus Cron Status Button */}
          <button
            onClick={() => setCronModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/70 hover:bg-emerald-900/60 text-xs text-emerald-300 font-medium transition-colors shadow-sm"
            title="Copernicus 5-day auto-polling worker for Tile T45RTT"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Clock size={14} className="text-emerald-400" />
            <span className="font-mono font-semibold">Cron: T45RTT (5-Day)</span>
            <span className="text-[10px] bg-emerald-900/80 px-1.5 py-0.2 rounded border border-emerald-700 text-emerald-200">
              &gt;10% Alert
            </span>
          </button>

          {onNavigateToWaterbodyExplorer && (
            <button
              onClick={() => onNavigateToWaterbodyExplorer(selectedWbId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
            >
              <Compass size={15} className="text-cyan-400" />
              <span>View in GIS Explorer</span>
            </button>
          )}

          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
          >
            <History size={15} className="text-amber-400" />
            <span>Past Runs ({historyItems.length})</span>
          </button>
        </div>
      </header>

      {/* Main Module Navigation Tabs */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 p-1.5 rounded-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <button
            onClick={() => setMainTab("sentinel_change")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mainTab === "sentinel_change"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Layers size={15} />
            <span>Sentinel-2 Change Detection (10m)</span>
          </button>

          <button
            onClick={() => setMainTab("subpixel_fusion")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mainTab === "subpixel_fusion"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Sparkles size={15} className={mainTab === "subpixel_fusion" ? "text-slate-950" : "text-amber-400"} />
            <span>Sub-Pixel Hybrid Resolution Fusion (3m)</span>
            <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded font-mono ${
              mainTab === "subpixel_fusion" ? "bg-slate-950 text-cyan-300" : "bg-amber-950/70 text-amber-300 border border-amber-800/80"
            }`}>
              Micro-Ponds
            </span>
          </button>

          <button
            onClick={() => setMainTab("bathymetry_depth")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mainTab === "bathymetry_depth"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Gauge size={15} className={mainTab === "bathymetry_depth" ? "text-slate-950" : "text-blue-400"} />
            <span>Bathymetry & Water Depth ($m^3$)</span>
            <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded font-mono ${
              mainTab === "bathymetry_depth" ? "bg-slate-950 text-cyan-300" : "bg-blue-950/70 text-blue-300 border border-blue-800/80"
            }`}>
              Ultrasonic
            </span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400 pr-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Tile: <strong className="text-white font-mono">T45RTT</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>Patna, Bihar</span>
        </div>
      </div>

      {/* TAB 1: Main Grid Layout: Controls (Left) + Interactive Visual Analysis (Right) */}
      {mainTab === "sentinel_change" && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Controls & Parameters (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-5">
          {/* 1. Waterbody Selector Card */}
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-2.5">
              <label htmlFor="waterbody-select" className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MapPin size={14} className="text-cyan-400" />
                Target Waterbody (Patna)
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                {verifiedPatnaWaterbodies.length} Available
              </span>
            </div>

            <select
              id="waterbody-select"
              value={selectedWbId}
              onChange={(e) => setSelectedWbId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 font-medium focus:outline-none focus:border-cyan-500 transition-colors"
            >
              {verifiedPatnaWaterbodies.map((wb) => (
                <option key={wb.id} value={wb.id} className="bg-slate-900">
                  {wb.name} ({wb.waterbody_type.toUpperCase()} · {wb.area_hectares || "—"} ha)
                </option>
              ))}
            </select>

            {selectedWaterbody && (
              <div className="mt-3 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Type: <strong className="capitalize text-white">{selectedWaterbody.waterbody_type}</strong></span>
                  <span>Baseline Area: <strong className="text-cyan-400">{selectedWaterbody.area_hectares} ha</strong></span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>District: <strong>{selectedWaterbody.district}, Bihar</strong></span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {selectedWaterbody.latitude.toFixed(4)}°N, {selectedWaterbody.longitude.toFixed(4)}°E
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Observation Dates & Available Sentinel-2 Overpasses */}
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 shadow-xl backdrop-blur-md space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar size={14} className="text-cyan-400" />
                Sentinel-2 Overpass Dates
              </h2>
              {loadingAvailability && (
                <span className="flex items-center gap-1 text-[11px] text-cyan-400 animate-pulse">
                  <RefreshCw size={11} className="animate-spin" /> Checking tile 45RTT...
                </span>
              )}
            </div>

            {/* Quick Season Presets */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset("monsoon")}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-800/80 hover:bg-cyan-900 transition-colors"
                title="Pre-Monsoon May 2025 vs Post-Monsoon Oct 2025"
              >
                🌊 Pre vs Post-Monsoon
              </button>
              <button
                type="button"
                onClick={() => applyPreset("yearly")}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
                title="Compare 1-year interval March 2025 vs March 2026"
              >
                📅 1-Year Delta
              </button>
              <button
                type="button"
                onClick={() => applyPreset("recent")}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
                title="Recent Dry Season Comparison"
              >
                ☀️ Recent 6-Mo
              </button>
            </div>

            {/* Earlier & Later Date Selectors */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor="earlier-date" className="block text-[11px] font-medium text-slate-400 mb-1">
                  Earlier Date (T0)
                </label>
                <input
                  id="earlier-date"
                  type="date"
                  value={earlierDate}
                  onChange={(e) => setEarlierDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label htmlFor="later-date" className="block text-[11px] font-medium text-slate-400 mb-1">
                  Later Date (T1)
                </label>
                <input
                  id="later-date"
                  type="date"
                  value={laterDate}
                  onChange={(e) => setLaterDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            {/* Available Scene Selector dropdown helper */}
            {availability && availability.scenes && availability.scenes.length > 0 && (
              <div className="text-[11px] text-slate-400 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                <div className="flex justify-between items-center text-slate-300 font-medium">
                  <span>Available Overpass Scenes:</span>
                  <span className="text-cyan-400">{availability.scenes.length} recorded</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1 max-h-20 overflow-y-auto">
                  {availability.scenes.slice(0, 8).map((sc: SatelliteSceneItem) => (
                    <button
                      key={sc.scene_id}
                      type="button"
                      onClick={() => {
                        if (sc.acquisition_date < laterDate) setEarlierDate(sc.acquisition_date);
                        else setLaterDate(sc.acquisition_date);
                      }}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                        sc.cloud_cover_percent < 5
                          ? "bg-emerald-950/40 text-emerald-300 border-emerald-800"
                          : sc.cloud_cover_percent < 15
                          ? "bg-slate-800 text-slate-300 border-slate-700"
                          : "bg-amber-950/40 text-amber-300 border-amber-800"
                      }`}
                      title={`${sc.satellite} · Cloud: ${sc.cloud_cover_percent}% · Click to assign`}
                    >
                      {sc.acquisition_date} ({sc.cloud_cover_percent}%)
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. NDWI Algorithm Parameters */}
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders size={14} className="text-cyan-400" />
                NDWI & Classification Thresholds
              </h2>
              <span className="text-[11px] font-mono text-cyan-400 font-bold">
                {ndwiThreshold >= 0 ? `+${ndwiThreshold.toFixed(2)}` : ndwiThreshold.toFixed(2)}
              </span>
            </div>

            {/* Slider */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>NDWI Water Cutoff</span>
                <span className="text-slate-500 font-mono">(Green - NIR) / (Green + NIR)</span>
              </div>
              <input
                type="range"
                min="-0.30"
                max="0.30"
                step="0.01"
                value={ndwiThreshold}
                onChange={(e) => setNdwiThreshold(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 cursor-pointer h-1.5 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>-0.30 (Turbid)</span>
                <span>0.00 (Default)</span>
                <span>+0.30 (Pure Water)</span>
              </div>
            </div>

            {/* Guidance presets */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setNdwiThreshold(0.0)}
                className={`px-2 py-1 text-[10px] rounded font-medium border text-center transition-colors ${
                  ndwiThreshold === 0.0
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
                title="McFeeters 1996 open water standard threshold"
              >
                Standard (0.00)
              </button>
              <button
                type="button"
                onClick={() => setNdwiThreshold(-0.1)}
                className={`px-2 py-1 text-[10px] rounded font-medium border text-center transition-colors ${
                  ndwiThreshold === -0.1
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
                title="Turbid sediment water common in monsoonal Bihar"
              >
                Turbid (-0.10)
              </button>
              <button
                type="button"
                onClick={() => setNdwiThreshold(0.1)}
                className={`px-2 py-1 text-[10px] rounded font-medium border text-center transition-colors ${
                  ndwiThreshold === 0.1
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
                title="Conservative deep clear open water mask"
              >
                Deep Clean (+0.10)
              </button>
            </div>

            {/* Tolerance & Noise Controls */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Stability Noise Tolerance:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0.5"
                  max="15.0"
                  step="0.5"
                  value={tolerancePct}
                  onChange={(e) => setTolerancePct(parseFloat(e.target.value) || 3.0)}
                  className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs font-mono text-white"
                />
                <span className="text-slate-500">%</span>
              </div>
            </div>

            {/* Run Analysis CTA */}
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all shadow-lg ${
                analyzing
                  ? "bg-cyan-600/50 text-cyan-200 cursor-wait"
                  : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20 active:scale-[0.98]"
              }`}
            >
              {analyzing ? (
                <>
                  <RefreshCw size={17} className="animate-spin" />
                  <span>Processing Sentinel-2 Rasters...</span>
                </>
              ) : (
                <>
                  <Satellite size={17} />
                  <span>Execute Change Detection</span>
                </>
              )}
            </button>

            {analysisError && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-400" />
                <span>{analysisError}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Results Cards & Interactive Satellite Comparison (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Executive KPI Results Cards */}
          {analysisResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Card 1: Earlier Area */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                  Earlier Water Spread ({analysisResult.earlier_date})
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-white font-mono">
                    {analysisResult.earlier_area_ha.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">ha</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Cloud: {analysisResult.earlier_cloud_cover_pct}% · Valid: {analysisResult.earlier_valid_coverage_pct}%
                </span>
              </div>

              {/* Card 2: Later Area */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                  Later Water Spread ({analysisResult.later_date})
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-cyan-300 font-mono">
                    {analysisResult.later_area_ha.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">ha</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Cloud: {analysisResult.later_cloud_cover_pct}% · Valid: {analysisResult.later_valid_coverage_pct}%
                </span>
              </div>

              {/* Card 3: Absolute Change */}
              <div
                className={`p-3.5 rounded-xl border shadow-lg ${
                  isExpansion
                    ? "bg-emerald-950/30 border-emerald-800/80"
                    : isShrinkage
                    ? "bg-rose-950/30 border-rose-800/80"
                    : "bg-slate-900/80 border-slate-800"
                }`}
              >
                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                  Net Area Delta
                </span>
                <div className="flex items-center gap-1.5">
                  {isExpansion ? (
                    <TrendingUp size={20} className="text-emerald-400 shrink-0" />
                  ) : isShrinkage ? (
                    <TrendingDown size={20} className="text-rose-400 shrink-0" />
                  ) : (
                    <Minus size={20} className="text-slate-400 shrink-0" />
                  )}
                  <span
                    className={`text-2xl font-bold font-mono ${
                      isExpansion
                        ? "text-emerald-300"
                        : isShrinkage
                        ? "text-rose-300"
                        : "text-slate-300"
                    }`}
                  >
                    {analysisResult.change_ha > 0
                      ? `+${analysisResult.change_ha.toFixed(2)}`
                      : analysisResult.change_ha.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">ha</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  10m Equal-Area UTM 45N
                </span>
              </div>

              {/* Card 4: Percentage & Classification */}
              <div
                className={`p-3.5 rounded-xl border shadow-lg ${
                  isExpansion
                    ? "bg-emerald-950/30 border-emerald-800/80"
                    : isShrinkage
                    ? "bg-rose-950/30 border-rose-800/80"
                    : "bg-slate-900/80 border-slate-800"
                }`}
              >
                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                  Classification & %
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-2xl font-bold font-mono ${
                      isExpansion
                        ? "text-emerald-300"
                        : isShrinkage
                        ? "text-rose-300"
                        : "text-slate-300"
                    }`}
                  >
                    {analysisResult.change_pct !== null
                      ? `${analysisResult.change_pct > 0 ? "+" : ""}${analysisResult.change_pct.toFixed(1)}%`
                      : "N/A"}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider mt-1 inline-block px-1.5 py-0.5 rounded ${
                    isExpansion
                      ? "bg-emerald-900/80 text-emerald-200"
                      : isShrinkage
                      ? "bg-rose-900/80 text-rose-200"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {classification}
                </span>
              </div>
            </div>
          )}

          {/* Interactive Imagery Comparison Viewer */}
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 shadow-xl backdrop-blur-md space-y-4">
            {/* Viewer Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              {/* Layer Selection */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setImageryLayer("true_color")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    imageryLayer === "true_color"
                      ? "bg-cyan-500 text-slate-950 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  True Color (B04-03-02)
                </button>
                <button
                  type="button"
                  onClick={() => setImageryLayer("ndwi_mask")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    imageryLayer === "ndwi_mask"
                      ? "bg-cyan-500 text-slate-950 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  NDWI Water Mask
                </button>
              </div>

              {/* View Mode Selection */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("swipe")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                    viewMode === "swipe"
                      ? "bg-slate-800 text-cyan-300 font-semibold shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Interactive split-screen swipe comparison"
                >
                  <Split size={14} />
                  <span>Swipe Split</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("side_by_side")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                    viewMode === "side_by_side"
                      ? "bg-slate-800 text-cyan-300 font-semibold shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Side-by-side comparison"
                >
                  <Columns size={14} />
                  <span>Side-by-Side</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("diff_map")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                    viewMode === "diff_map"
                      ? "bg-slate-800 text-cyan-300 font-semibold shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Categorical change difference map"
                >
                  <Layers size={14} />
                  <span>Change Difference</span>
                </button>
              </div>
            </div>

            {/* Main Visual Display Area */}
            {analysisResult ? (
              <div className="space-y-3">
                {/* 1. Swipe Split Comparison Mode */}
                {viewMode === "swipe" && (
                  <div className="space-y-2">
                    <div
                      className="relative w-full aspect-square max-h-[460px] mx-auto rounded-xl overflow-hidden border border-slate-700/80 cursor-ew-resize select-none bg-slate-950"
                      onMouseDown={() => (isDraggingSwipe.current = true)}
                      onMouseUp={() => (isDraggingSwipe.current = false)}
                      onMouseLeave={() => (isDraggingSwipe.current = false)}
                      onMouseMove={handleSwipeMove}
                      onTouchMove={handleSwipeMove}
                    >
                      {/* Later Image (Bottom full layer) */}
                      <img
                        src={
                          imageryLayer === "true_color"
                            ? analysisResult.later_true_color_url
                            : analysisResult.later_ndwi_mask_url
                        }
                        alt="Later satellite observation"
                        className="absolute inset-0 w-full h-full object-contain"
                        draggable={false}
                      />

                      {/* Earlier Image (Clipped top layer) */}
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ width: `${swipePosition}%` }}
                      >
                        <img
                          src={
                            imageryLayer === "true_color"
                              ? analysisResult.earlier_true_color_url
                              : analysisResult.earlier_ndwi_mask_url
                          }
                          alt="Earlier satellite observation"
                          className="absolute inset-0 w-full h-full object-contain max-w-none"
                          style={{ width: "100%" }}
                          draggable={false}
                        />
                      </div>

                      {/* Divider Handle */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 cursor-ew-resize shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                        style={{ left: `${swipePosition}%` }}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-950 border-2 border-cyan-400 text-cyan-400 flex items-center justify-center shadow-lg">
                          <Split size={14} />
                        </div>
                      </div>

                      {/* Badges on images */}
                      <span className="absolute top-3 left-3 px-2 py-1 rounded bg-slate-950/90 text-cyan-300 text-[11px] font-mono border border-slate-800 backdrop-blur-md">
                        Earlier: {analysisResult.earlier_date}
                      </span>
                      <span className="absolute top-3 right-3 px-2 py-1 rounded bg-slate-950/90 text-emerald-300 text-[11px] font-mono border border-slate-800 backdrop-blur-md">
                        Later: {analysisResult.later_date}
                      </span>
                    </div>

                    <p className="text-center text-[11px] text-slate-400">
                      💡 Click and drag the slider horizontally to compare surface reflectance between dates.
                    </p>
                  </div>
                )}

                {/* 2. Side-by-Side Mode */}
                {viewMode === "side_by_side" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Earlier */}
                    <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-2 space-y-2">
                      <div className="flex justify-between items-center text-xs px-1">
                        <span className="font-semibold text-slate-200">
                          Earlier Observation ({analysisResult.earlier_date})
                        </span>
                        <span className="text-cyan-400 font-mono font-bold">
                          {analysisResult.earlier_area_ha.toFixed(2)} ha
                        </span>
                      </div>
                      <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-900">
                        <img
                          src={
                            imageryLayer === "true_color"
                              ? analysisResult.earlier_true_color_url
                              : analysisResult.earlier_ndwi_mask_url
                          }
                          alt="Earlier raster"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>

                    {/* Later */}
                    <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-2 space-y-2">
                      <div className="flex justify-between items-center text-xs px-1">
                        <span className="font-semibold text-slate-200">
                          Later Observation ({analysisResult.later_date})
                        </span>
                        <span className="text-cyan-400 font-mono font-bold">
                          {analysisResult.later_area_ha.toFixed(2)} ha
                        </span>
                      </div>
                      <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-900">
                        <img
                          src={
                            imageryLayer === "true_color"
                              ? analysisResult.later_true_color_url
                              : analysisResult.later_ndwi_mask_url
                          }
                          alt="Later raster"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Change Difference Map Mode */}
                {viewMode === "diff_map" && (
                  <div className="space-y-3">
                    <div className="aspect-square max-h-[460px] mx-auto rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                      <img
                        src={analysisResult.diff_map_url}
                        alt="Change difference map"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Legend Bar */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    Map Legend:
                  </span>
                  <div className="flex flex-wrap items-center gap-4 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-sm bg-[#0284c7] inline-block shadow-sm" />
                      <span className="text-slate-300">Water (NDWI &gt; {ndwiThreshold})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-sm bg-[#ef4444] inline-block shadow-sm" />
                      <span className="text-slate-300">Water Loss / Shrinkage</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-sm bg-[#10b981] inline-block shadow-sm" />
                      <span className="text-slate-300">Water Gain / Expansion</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-sm bg-[#94a3b8] inline-block shadow-sm" />
                      <span className="text-slate-300">Dry Bed / Non-Water</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-500 text-sm">
                Select dates and click "Execute Change Detection" to generate imagery.
              </div>
            )}
          </div>

          {/* Results Interpretation & Scientific Context Card */}
          {analysisResult && (
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 shadow-xl backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-400" />
                  Hydrological Interpretation & Recommendations
                </h3>
                <span className="text-xs text-slate-400">
                  Confidence: <strong className="text-white">{analysisResult.confidence_score}%</strong>
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <p className="mb-2">
                  <strong className="text-white">Detected Condition: </strong>
                  {analysisResult.classification_reason}
                </p>
                <p className="text-slate-400">
                  {isExpansion && (
                    <span>
                      Surface water expansion is consistent with monsoonal runoff accumulation. Monitor inlet channels for urban siltation and recommend post-monsoon catchment desiltation to maintain capacity.
                    </span>
                  )}
                  {isShrinkage && (
                    <span>
                      Notable peripheral shrinkage indicates high evaporation, potential agricultural pumping, or progressive silt accretion. Recommend field ground-truthing to evaluate weed infestation (water hyacinth) versus embankment encroachment.
                    </span>
                  )}
                  {!isExpansion && !isShrinkage && !isInconclusive && (
                    <span>
                      Water spread remains stable within normal optical sensor tolerances. Routine quarterly satellite surveillance is advised to track seasonal retention.
                    </span>
                  )}
                  {isInconclusive && (
                    <span>
                      Analysis inconclusive due to cloud or cloud shadow contamination. Please choose observation dates with clear overpasses (&lt;10% cloud cover).
                    </span>
                  )}
                </p>
              </div>

              {/* Regulatory & Methodology Disclaimer */}
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Official Methodology Disclaimer: </strong>
                  Satellite-derived estimates use Sentinel-2 Level-2A 10m surface reflectance (B03 Green, B08 NIR).
                  NDWI measures surface water reflectance and does not establish bathymetric depth, chemical purity,
                  or statutory cadastral boundaries. Field verification by designated district officers is recommended.
                </div>
              </div>

              {/* Export Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-400">
                  Export reproducible findings:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition-colors"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-400" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={downloadPdf}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white font-semibold shadow-md transition-colors"
                  >
                    <Download size={14} />
                    <span>Download Official PDF Report</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* TAB 2: Sub-Pixel Hybrid Resolution Fusion (3m Commercial / UAV) */}
      {mainTab === "subpixel_fusion" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Controls & Linear Spectral Unmixing Configuration */}
          <div className="lg:col-span-4 space-y-5">
            {/* Waterbody Selector Card */}
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-2.5">
                <label htmlFor="wb-fusion-select" className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MapPin size={14} className="text-cyan-400" />
                  Target Waterbody
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {selectedWaterbody?.area_hectares ? `${selectedWaterbody.area_hectares} ha` : "—"}
                </span>
              </div>

              <select
                id="wb-fusion-select"
                value={selectedWbId}
                onChange={(e) => setSelectedWbId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 font-medium focus:outline-none focus:border-cyan-500 transition-colors"
              >
                {verifiedPatnaWaterbodies.map((wb) => (
                  <option key={wb.id} value={wb.id} className="bg-slate-900">
                    {wb.name} ({wb.area_hectares || "—"} ha)
                  </option>
                ))}
              </select>

              {/* Micro-Pond Classification Callout */}
              <div className="mt-3 p-3 rounded-lg bg-amber-950/30 border border-amber-800/60 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-400 shrink-0" />
                  <span className="font-semibold text-amber-200">
                    {selectedWaterbody && (selectedWaterbody.area_hectares ?? 0) < 0.5
                      ? "Micro-Pond (< 0.5 ha) · Edge-Vulnerable"
                      : "Standard Waterbody (> 0.5 ha)"}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  In ponds under 0.2 ha, a standard 10m Sentinel-2 pixel (100 m²) covers up to 50% of the pond's total surface.
                  Shoreline pixels capture mixed reflectance of shallow water, silt, and masonry ghats. Linear Spectral Unmixing (LSU)
                  resolves continuous water fractions (f_water) per sub-pixel.
                </p>
              </div>
            </div>

            {/* Fusion Parameters & Commercial Sensor Selector */}
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 shadow-xl backdrop-blur-md space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Cpu size={14} className="text-cyan-400" />
                High-Resolution Sensor & Ingestion
              </h2>

              <div>
                <label htmlFor="fusion-sensor-select" className="block text-[11px] font-medium text-slate-400 mb-1.5">
                  High-Resolution Constellation / Drone
                </label>
                <select
                  id="fusion-sensor-select"
                  value={subpixelSensor}
                  onChange={(e) => setSubpixelSensor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                >
                  <option value="PlanetScope 3m SuperDove">PlanetScope 3m SuperDove (8-band VNIR)</option>
                  <option value="SkySat High-Res (0.5m)">SkySat High-Res 50cm Orthorectified</option>
                  <option value="UAV Drone Orthomosaic (0.05m)">UAV Drone Orthomosaic (5cm RTK-GNSS)</option>
                </select>
              </div>

              <div>
                <label htmlFor="subpixel-date-input" className="block text-[11px] font-medium text-slate-400 mb-1">
                  Acquisition Overpass Date
                </label>
                <input
                  id="subpixel-date-input"
                  type="date"
                  value={subpixelDate}
                  onChange={(e) => setSubpixelDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {/* LSU Endmember Model Formula Display */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] space-y-2">
                <div className="flex justify-between items-center text-slate-300 font-medium">
                  <span>Linear Spectral Unmixing (LSU)</span>
                  <span className="text-cyan-400 font-mono text-[10px]">3x3 Grid (9x Density)</span>
                </div>
                <div className="font-mono text-[10px] bg-slate-900 p-2 rounded border border-slate-800 text-slate-300">
                  R(pixel) = f_water · R_water + (1 - f_water) · R_soil
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                  <div>Water Endmember: <strong className="text-cyan-300">Green: 0.048</strong></div>
                  <div>Soil Endmember: <strong className="text-amber-300">NIR: 0.385</strong></div>
                </div>
              </div>

              {/* Run Fusion Button */}
              <button
                onClick={handleRunFusion}
                disabled={executingFusion}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all shadow-lg ${
                  executingFusion
                    ? "bg-cyan-600/50 text-cyan-200 cursor-wait"
                    : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20 active:scale-[0.98]"
                }`}
              >
                {executingFusion ? (
                  <>
                    <RefreshCw size={17} className="animate-spin" />
                    <span>Unmixing Sub-Pixel Grid (3m)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    <span>Execute 3m Sub-Pixel Fusion</span>
                  </>
                )}
              </button>

              {fusionError && (
                <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-400" />
                  <span>{fusionError}</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: High-Resolution Fusion Visuals & Comparative Analysis */}
          <div className="lg:col-span-8 space-y-5">
            {fusionResult ? (
              <>
                {/* Top Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                      Standard Sentinel-2 (10m)
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-white font-mono">
                        {fusionResult.measurements.standard_sentinel2_10m_area_ha.toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">ha</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Hard Binary Mask (100 m²/px)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                      Fused High-Res (3m LSU)
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-cyan-300 font-mono">
                        {fusionResult.measurements.fused_high_res_3m_area_ha.toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">ha</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium mt-1 block">
                      Sub-pixel fraction integration
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                      Edge-Effect Correction
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-amber-300 font-mono">
                        {fusionResult.measurements.edge_effect_correction_pct > 0 ? "+" : ""}
                        {fusionResult.measurements.edge_effect_correction_pct.toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {fusionResult.measurements.area_delta_ha > 0 ? "+" : ""}
                      {fusionResult.measurements.area_delta_ha.toFixed(3)} ha recovered
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                      Boundary Pixels Resolved
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-emerald-400 font-mono">
                        {fusionResult.measurements.boundary_edge_pixels_resolved}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">cells</span>
                    </div>
                    <span className="text-[10px] text-emerald-300 mt-1 block">
                      -68% Edge Uncertainty
                    </span>
                  </div>
                </div>

                {/* High-Resolution Viewer Card */}
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 shadow-xl backdrop-blur-md space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">
                        {fusionResult.waterbody_name} · 3m Fused Visual
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {fusionResult.pixel_density_gain}
                      </span>
                    </div>

                    {/* View Layer Selector */}
                    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setFusionViewMode("subpixel_fraction")}
                        className={`px-3 py-1 rounded-md font-medium transition-colors ${
                          fusionViewMode === "subpixel_fraction"
                            ? "bg-cyan-500 text-slate-950 font-semibold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Water Fraction (f_water) Heatmap
                      </button>
                      <button
                        type="button"
                        onClick={() => setFusionViewMode("fused_rgb")}
                        className={`px-3 py-1 rounded-md font-medium transition-colors ${
                          fusionViewMode === "fused_rgb"
                            ? "bg-cyan-500 text-slate-950 font-semibold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        3m Fused True Color
                      </button>
                    </div>
                  </div>

                  {/* Raster Display Area */}
                  <div className="aspect-square max-h-[460px] mx-auto rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center p-2">
                    <img
                      src={
                        fusionViewMode === "subpixel_fraction"
                          ? fusionResult.visuals.subpixel_fraction_url
                          : fusionResult.visuals.fused_true_color_url
                      }
                      alt="Sub-pixel fusion visual"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>

                  {/* Fraction Legend */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                      Water Fraction Legend:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">0.0 (Dry Shoreline)</span>
                      <div className="w-32 h-3 rounded bg-gradient-to-r from-amber-700 via-emerald-600 to-blue-500 border border-slate-700"></div>
                      <span className="text-[11px] text-cyan-300 font-semibold">1.0 (Deep Open Water)</span>
                    </div>
                  </div>
                </div>

                {/* Scientific Context Card */}
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 shadow-xl backdrop-blur-md space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-400" />
                    Sub-Pixel Fusion Methodology & Edge Recovery
                  </h3>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
                    <p>
                      <strong className="text-white">Elimination of Binary Clipping: </strong>
                      Conventional 10-meter Sentinel-2 index thresholding assigns entire 100 m² cells as strictly 100% water or 0% water.
                      Along narrow masonry steps, stone embankments, or weed patches in small Patna tanks, this binary decision introduces severe boundary bias.
                    </p>
                    <p className="text-slate-400">
                      By decomposing the multi-spectral signature using Linear Spectral Unmixing into pure water and soil endmembers,
                      the system determines that peripheral cells carry fractional moisture (e.g. 35% or 72%), producing an edge-corrected surface area of{" "}
                      <strong className="text-cyan-300 font-mono">
                        {fusionResult.measurements.fused_high_res_3m_area_ha.toFixed(2)} ha
                      </strong>{" "}
                      versus the uncorrected{" "}
                      <strong className="text-slate-200 font-mono">
                        {fusionResult.measurements.standard_sentinel2_10m_area_ha.toFixed(2)} ha
                      </strong>.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-24 text-center text-slate-500 text-sm rounded-xl bg-slate-900/50 border border-slate-800">
                Click "Execute 3m Sub-Pixel Fusion" to unmix boundary edge pixels.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Bathymetry & Water Depth Coupling ($m^3$) */}
      {mainTab === "bathymetry_depth" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Ultrasonic Field Telemetry Logger */}
          <div className="lg:col-span-4 space-y-5">
            {/* Target Waterbody Selector */}
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-2.5">
                <label htmlFor="wb-bathy-select" className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MapPin size={14} className="text-cyan-400" />
                  Target Waterbody
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {selectedWaterbody?.district || "Patna"}
                </span>
              </div>

              <select
                id="wb-bathy-select"
                value={selectedWbId}
                onChange={(e) => setSelectedWbId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 font-medium focus:outline-none focus:border-cyan-500 transition-colors"
              >
                {verifiedPatnaWaterbodies.map((wb) => (
                  <option key={wb.id} value={wb.id} className="bg-slate-900">
                    {wb.name} ({wb.area_hectares || "—"} ha)
                  </option>
                ))}
              </select>

              {/* Surface Area Display */}
              <div className="mt-3 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs flex justify-between items-center text-slate-300">
                <span>Satellite Optical Area ($A$):</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {analysisResult?.later_area_ha
                    ? `${analysisResult.later_area_ha.toFixed(2)} ha (${(analysisResult.later_area_ha * 10000).toLocaleString()} m²)`
                    : `${selectedWaterbody?.area_hectares || 1.0} ha`}
                </span>
              </div>
            </div>

            {/* Ultrasonic Ground Sensor Logger Form */}
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 shadow-xl backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Gauge size={14} className="text-blue-400" />
                  Ultrasonic Telemetry Logger
                </h2>
                <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800 font-mono">
                  Ground-Truth
                </span>
              </div>

              <form onSubmit={handleRecordDepth} className="space-y-3.5">
                <div>
                  <label htmlFor="depth-meters-input" className="block text-[11px] font-medium text-slate-300 mb-1 flex justify-between">
                    <span>Field Depth Measurement ($h$)</span>
                    <span className="text-slate-500 font-mono">Meters</span>
                  </label>
                  <div className="relative">
                    <input
                      id="depth-meters-input"
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="15.0"
                      value={newDepthMeters}
                      onChange={(e) => setNewDepthMeters(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                      placeholder="e.g. 2.10"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">m</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="sensor-id-input" className="block text-[11px] font-medium text-slate-400 mb-1">
                    Sensor Serial ID / Gauge Tag
                  </label>
                  <input
                    id="sensor-id-input"
                    type="text"
                    value={newSensorId}
                    onChange={(e) => setNewSensorId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    placeholder="US-PATNA-09"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="recorded-by-input" className="block text-[11px] font-medium text-slate-400 mb-1">
                    Inspecting Officer / Field Telemetry Station
                  </label>
                  <input
                    id="recorded-by-input"
                    type="text"
                    value={newRecordedBy}
                    onChange={(e) => setNewRecordedBy(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    placeholder="Officer R. Trivedi"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReading}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all shadow-lg ${
                    submittingReading
                      ? "bg-blue-600/50 text-blue-200 cursor-wait"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-[0.98]"
                  }`}
                >
                  {submittingReading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Recording Telemetry...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Record Depth & Recalculate Volume</span>
                    </>
                  )}
                </button>
              </form>

              {readingSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle size={15} className="shrink-0 text-emerald-400" />
                  <span>{readingSuccessMsg}</span>
                </div>
              )}

              {bathymetryError && (
                <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-400" />
                  <span>{bathymetryError}</span>
                </div>
              )}
            </div>

            {/* Ultrasonic Hardware Specifications Card */}
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 shadow-xl backdrop-blur-md space-y-2 text-xs">
              <h3 className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Radio size={14} className="text-cyan-400" />
                Ultrasonic Hardware Specifications
              </h3>
              <div className="space-y-1 text-slate-400 text-[11px]">
                <div className="flex justify-between">
                  <span>Transducer:</span>
                  <span className="text-slate-200">Acoustic 40 kHz Sounder</span>
                </div>
                <div className="flex justify-between">
                  <span>Measurement Range:</span>
                  <span className="text-slate-200">0.10 m – 15.00 m</span>
                </div>
                <div className="flex justify-between">
                  <span>Precision Tolerance:</span>
                  <span className="text-emerald-400 font-mono">± 5 mm</span>
                </div>
                <div className="flex justify-between">
                  <span>Telemetry Interface:</span>
                  <span className="text-slate-200">LoRaWAN / 4G NB-IoT</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Volumetric Results & Hypsographic Modeling */}
          <div className="lg:col-span-8 space-y-5">
            {bathymetryData ? (
              <>
                {/* 4 KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                      Measured Water Depth ($h$)
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-white font-mono">
                        {bathymetryData.coupled_metrics.measured_depth_m.toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">meters</span>
                    </div>
                    <span className="text-[10px] text-cyan-400 mt-1 block">
                      Max Basin: {bathymetryData.coupled_metrics.max_depth_m.toFixed(1)} m
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                      Stored Water Volume ($V$)
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-cyan-300 font-mono">
                        {Math.round(bathymetryData.coupled_metrics.computed_volume_m3).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">m³</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {(bathymetryData.coupled_metrics.computed_volume_m3 / 1000).toFixed(2)} ML (Million L)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                      Basin Storage Capacity
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-emerald-400 font-mono">
                        {bathymetryData.coupled_metrics.volume_percentage.toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Full Pool: {Math.round(bathymetryData.coupled_metrics.storage_capacity_m3).toLocaleString()} m³
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                      Current Water Deficit
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-rose-400 font-mono">
                        {Math.round(bathymetryData.coupled_metrics.water_deficit_m3).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">m³</span>
                    </div>
                    <span className="text-[10px] text-rose-300 mt-1 block">
                      Inflow replenishment needed
                    </span>
                  </div>
                </div>

                {/* Hypsographic Basin Model & Volumetric Cross-Section */}
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 shadow-xl backdrop-blur-md space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Droplets size={15} className="text-cyan-400" />
                      Hypsographic Basin Volume Coupling ($V = \frac{1}{2} A \cdot h$)
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      Model: Truncated Parabolic Basin
                    </span>
                  </div>

                  {/* Visual Cross-Section Diagram */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="relative h-24 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 flex items-end">
                      {/* Water Column Layer */}
                      <div
                        className="w-full bg-gradient-to-t from-blue-700 via-cyan-600 to-cyan-400 transition-all duration-700 relative"
                        style={{
                          height: `${Math.min(100, Math.max(10, bathymetryData.coupled_metrics.volume_percentage))}%`,
                        }}
                      >
                        <div className="absolute top-1 left-3 text-[10px] font-bold text-slate-950 bg-white/80 px-1.5 py-0.2 rounded shadow-sm">
                          Water Level: {bathymetryData.coupled_metrics.measured_depth_m.toFixed(2)} m ({bathymetryData.coupled_metrics.volume_percentage.toFixed(0)}% Full)
                        </div>
                      </div>

                      {/* Freeboard Line */}
                      <div className="absolute top-2 right-3 text-[10px] text-slate-400 font-mono">
                        Freeboard Crest: {bathymetryData.coupled_metrics.max_depth_m.toFixed(1)} m
                      </div>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400 px-1 font-mono">
                      <span>Basin Bed (Silt: ~0.35m)</span>
                      <span>Surface Spread: {(bathymetryData.coupled_metrics.surface_area_ha * 10000).toLocaleString()} m²</span>
                      <span>Full Capacity Crest: {Math.round(bathymetryData.coupled_metrics.storage_capacity_m3).toLocaleString()} m³</span>
                    </div>
                  </div>
                </div>

                {/* 6-Month Volumetric Trend Projection & Telemetry History */}
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 shadow-xl backdrop-blur-md space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <BarChart3 size={15} className="text-cyan-400" />
                      Seasonal Volumetric Trend & Field Ultrasonic Logs
                    </h3>
                    <span className="text-xs text-slate-400">
                      Sensor: <strong className="text-white font-mono">{bathymetryData.sensor_metadata.sensor_id}</strong>
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-semibold uppercase">
                          <th className="py-2 px-3">Timeline</th>
                          <th className="py-2 px-3">Depth ($m$)</th>
                          <th className="py-2 px-3">Storage ($m^3$)</th>
                          <th className="py-2 px-3">Capacity %</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {bathymetryData.trend.map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-950/60">
                            <td className="py-2 px-3 font-sans font-medium text-slate-200">{t.month}</td>
                            <td className="py-2 px-3">{t.depth_m.toFixed(2)} m</td>
                            <td className="py-2 px-3 text-cyan-300">{Math.round(t.volume_m3).toLocaleString()} m³</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${
                                t.capacity_pct > 70
                                  ? "bg-emerald-950 text-emerald-300"
                                  : t.capacity_pct > 40
                                  ? "bg-blue-950 text-blue-300"
                                  : "bg-amber-950 text-amber-300"
                              }`}>
                                {t.capacity_pct.toFixed(0)}%
                              </span>
                            </td>
                            <td className="py-2 px-3 font-sans text-slate-400">
                              {t.capacity_pct > 70 ? "Post-Monsoon High" : t.capacity_pct > 40 ? "Normal Storage" : "Dry Season Depleted"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-24 text-center text-slate-500 text-sm rounded-xl bg-slate-900/50 border border-slate-800">
                {loadingBathymetry ? (
                  <span className="flex items-center justify-center gap-2 text-cyan-400">
                    <RefreshCw size={18} className="animate-spin" /> Loading ultrasonic bathymetric model...
                  </span>
                ) : (
                  "Select a waterbody to display coupled depth and volumetric profile."
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Copernicus 5-Day Automated Cron Ingestion Modal */}
      {cronModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Clock size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Copernicus 5-Day Automated Ingestion Worker
                  </h3>
                  <p className="text-xs text-slate-400">
                    Background satellite polling over Tile T45RTT with auto-dispatch on &gt;10% shrinkage
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCronModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>

            {/* Ingestion Parameters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Target Tile</span>
                <span className="font-mono font-bold text-white">{cronStatus?.target_tile || "T45RTT"}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Cadence</span>
                <span className="font-mono font-bold text-cyan-300">Every 5 Days</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Alert Trigger</span>
                <span className="font-mono font-bold text-rose-400">&gt; 10.0% Shrinkage</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Status</span>
                <span className="font-mono font-bold text-emerald-400">Active Polling</span>
              </div>
            </div>

            {/* Manual Trigger Action */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-white">Run Immediate Overpass Ingestion Cycle</h4>
                  <p className="text-[11px] text-slate-400">
                    Polls Copernicus Hub, extracts latest 5-day overpass rasters, and evaluates shrinkage on all 15 Patna waterbodies.
                  </p>
                </div>
                <button
                  onClick={handleTriggerCron}
                  disabled={triggeringCron}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    triggeringCron
                      ? "bg-emerald-700/50 text-emerald-200 cursor-wait"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95"
                  }`}
                >
                  {triggeringCron ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Polling Copernicus API...</span>
                    </>
                  ) : (
                    <>
                      <Satellite size={14} />
                      <span>Trigger Ingestion Cycle Now</span>
                    </>
                  )}
                </button>
              </div>

              {cronTriggerResult && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-emerald-400" />
                    <span>Cycle executed successfully in {cronTriggerResult.execution_time_seconds}s</span>
                  </div>
                  <div className="text-[11px] text-slate-300 flex flex-wrap gap-3 font-mono">
                    <span>Processed: {cronTriggerResult.waterbodies_processed} waterbodies</span>
                    <span>Tile: {cronTriggerResult.tile_id}</span>
                    <span>Alerts Dispatched: {cronTriggerResult.alerts_triggered_count}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Alerts Dispatched Table */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Recent Shrinkage Alerts Dispatched to Field Officers
              </h4>
              {cronStatus?.recent_alerts && cronStatus.recent_alerts.length > 0 ? (
                cronStatus.recent_alerts.map((al) => (
                  <div
                    key={al.id}
                    className="p-3 rounded-xl bg-slate-950 border border-rose-900/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{al.waterbody_name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                          {al.shrinkage_pct}% ({al.shrinkage_ha} ha)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{al.message}</p>
                    </div>
                    <span className="text-[10px] uppercase font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800">
                      Dispatched
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No shrinkage alerts &gt;10% recorded in recent cycles.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History size={18} className="text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Past Change Detection Runs · {selectedWaterbody?.name}
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {historyItems.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No historical change detection runs recorded yet for this waterbody.
                </div>
              ) : (
                historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {item.earlier_date} → {item.later_date}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded ${
                            item.classification === "expansion"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : item.classification === "shrinkage"
                              ? "bg-rose-950 text-rose-300 border border-rose-800"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {item.classification}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px] flex gap-3">
                        <span>Area: {item.earlier_area_ha} ha → {item.later_area_ha} ha</span>
                        <span>Delta: {item.change_ha > 0 ? `+${item.change_ha}` : item.change_ha} ha ({item.change_pct !== null ? `${item.change_pct}%` : "—"})</span>
                        <span>NDWI: {item.ndwi_threshold}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const url = getSatelliteChangePdfUrl(selectedWbId, item.id);
                          window.open(url, "_blank");
                        }}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400"
                        title="Download PDF"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
