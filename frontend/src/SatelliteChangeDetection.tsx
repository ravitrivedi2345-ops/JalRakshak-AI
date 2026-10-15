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
  Satellite
} from "lucide-react";
import { verifiedPatnaWaterbodies, WaterbodyItem } from "./patnaWaterbodiesData";
import {
  fetchSatelliteAvailability,
  runSatelliteChangeDetection,
  fetchSatelliteChangeHistory,
  getSatelliteChangePdfUrl,
  getSatelliteChangeCsvUrl,
  SatelliteAvailabilityData,
  SatelliteChangeResult,
  SatelliteChangeHistoryItem,
  SatelliteSceneItem
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

        <div className="flex items-center gap-2.5">
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

      {/* Main Grid Layout: Controls (Left) + Interactive Visual Analysis (Right) */}
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
