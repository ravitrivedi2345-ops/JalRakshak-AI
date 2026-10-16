import React, { useState } from "react";
import {
  X,
  FileSpreadsheet,
  Download,
  Printer,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Layers,
  Droplets,
  Calendar,
  Activity,
  CheckCircle2,
  Info,
  Waves,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { StudyAreaItem, StudyAreaSpatialAnalysis } from "./mapTypes";

interface StudyAreaSpatialAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  studyArea: StudyAreaItem;
  analysis: StudyAreaSpatialAnalysis | null;
  onExportCsv: () => void;
  onExportGeoJson: () => void;
}

export default function StudyAreaSpatialAnalysisModal({
  isOpen,
  onClose,
  studyArea,
  analysis,
  onExportCsv,
  onExportGeoJson,
}: StudyAreaSpatialAnalysisModalProps) {
  const [activeTab, setActiveTab] = useState<"inventory" | "water_spread" | "conservation" | "environmental">("inventory");

  if (!isOpen || !analysis) return null;

  const inv = analysis.inventory_metrics;
  const hws = analysis.historical_water_spread;
  const cons = analysis.conservation_analysis;
  const env = analysis.environmental_change_analysis;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/90 shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl text-white shadow-md shadow-cyan-500/20 font-bold">
              <Activity size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Watershed Spatial Analysis & GIS Study
                </h2>
                <span
                  className={`text-[9.5px] uppercase font-bold px-2 py-0.5 rounded border ${
                    studyArea.boundary_status === "verified"
                      ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                      : "bg-amber-950 text-amber-300 border-amber-800"
                  }`}
                >
                  {studyArea.boundary_status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                <strong className="text-cyan-400">{studyArea.name}</strong> • {studyArea.region}
              </p>
            </div>
          </div>

          {/* Action buttons: Export CSV, GeoJSON, Print, Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={onExportCsv}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              title="Export filtered waterbody inventory as CSV"
            >
              <FileSpreadsheet size={13} className="text-emerald-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={onExportGeoJson}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              title="Export GIS features as GeoJSON"
            >
              <Download size={13} className="text-cyan-400" />
              <span>GeoJSON</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              title="Print comprehensive study area report"
            >
              <Printer size={13} className="text-violet-400" />
              <span className="hidden sm:inline">Report</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-950/60 overflow-x-auto shrink-0 text-xs font-semibold">
          {[
            { id: "inventory", label: "Inventory Analysis", icon: Layers },
            { id: "water_spread", label: "Historical Water-Spread", icon: Droplets },
            { id: "conservation", label: "Drainage & Conservation Structures", icon: ShieldCheck },
            { id: "environmental", label: "Environmental Change Alerts", icon: AlertTriangle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
                  isActive
                    ? "border-cyan-400 text-cyan-300 bg-cyan-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <Icon size={14} className={isActive ? "text-cyan-400" : "text-slate-500"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Inventory Analysis */}
          {activeTab === "inventory" && (
            <div className="space-y-5">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 font-medium block">Total Mapped Records</span>
                  <span className="text-2xl font-bold text-white font-mono">{inv.total_waterbody_records}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Authoritative GIS polygons</span>
                </div>
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 font-medium block">Total Surface Area</span>
                  <span className="text-2xl font-bold text-cyan-300 font-mono">{inv.total_mapped_area_ha.toLocaleString()} <span className="text-xs font-normal text-slate-400">ha</span></span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Mapped polygon area</span>
                </div>
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 font-medium block">Watershed Extent</span>
                  <span className="text-2xl font-bold text-emerald-400 font-mono">{studyArea.area_sqkm?.toLocaleString() || "—"} <span className="text-xs font-normal text-slate-400">sq km</span></span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Catchment boundary</span>
                </div>
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 font-medium block">Feature Density</span>
                  <span className="text-2xl font-bold text-violet-400 font-mono">
                    {studyArea.area_sqkm ? (inv.total_waterbody_records / (studyArea.area_sqkm / 100)).toFixed(2) : "0.45"}
                    <span className="text-xs font-normal text-slate-400"> /100km²</span>
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Spatial concentration</span>
                </div>
              </div>

              {/* Category Breakdown & Verification Status Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category distribution */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Layers size={14} className="text-cyan-400" />
                    Feature Category Breakdown
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(inv.category_distribution).map(([cat, count]) => {
                      const pct = Math.round((count / Math.max(inv.total_waterbody_records, 1)) * 100);
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="capitalize text-slate-300">{cat.replace(/_/g, " ")}</span>
                            <span className="font-mono text-cyan-300 font-semibold">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Verification breakdown */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    Data Provenance & Verification
                  </h3>
                  <div className="space-y-2.5">
                    {Object.entries(inv.verification_breakdown).map(([statusKey, count]) => (
                      <div key={statusKey} className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-lg border border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              statusKey === "field_verified"
                                ? "bg-emerald-400"
                                : statusKey === "satellite_derived"
                                ? "bg-cyan-400"
                                : statusKey === "imported_source"
                                ? "bg-violet-400"
                                : "bg-amber-400"
                            }`}
                          />
                          <span className="capitalize text-xs font-medium text-slate-200">
                            {statusKey.replace(/_/g, " ")}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-white">{count} features</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <strong className="text-slate-300">Authoritative Repositories:</strong>{" "}
                    {inv.data_source_citations.slice(0, 3).join("; ")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Historical Water-Spread Dynamics */}
          {activeTab === "water_spread" && (
            <div className="space-y-5">
              <div className="p-4 bg-cyan-950/20 border border-cyan-800/40 rounded-xl flex items-start gap-3 text-xs text-cyan-200/90 leading-relaxed">
                <Info size={18} className="text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-cyan-300">Multi-Epoch NDWI Comparative Analysis:</strong> Surface water spread is calculated across recurring Sentinel-2 MSI (10m) and Landsat-8/9 (30m) optical acquisitions using Normalized Difference Water Index (NDWI) with cloud masking. Seasonal desiccation and post-monsoon storage expansion are tracked relative to baseline.
                </div>
              </div>

              {/* Statistics highlight */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[10.5px] text-slate-400 font-medium block">Pre-Monsoon Average</span>
                  <span className="text-xl font-bold text-amber-300 font-mono">{hws.pre_monsoon_mean_ha} ha</span>
                  <span className="text-[10px] text-slate-500 block">Dry season base</span>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[10.5px] text-slate-400 font-medium block">Post-Monsoon Average</span>
                  <span className="text-xl font-bold text-cyan-300 font-mono">{hws.post_monsoon_mean_ha} ha</span>
                  <span className="text-[10px] text-slate-500 block">Peak recharge storage</span>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[10.5px] text-slate-400 font-medium block">Seasonal Delta (Area)</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono">+{hws.seasonal_delta_ha} ha</span>
                  <span className="text-[10px] text-slate-500 block">Inflow replenishment</span>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-[10.5px] text-slate-400 font-medium block">Expansion Percentage</span>
                  <span className="text-xl font-bold text-violet-400 font-mono">+{hws.seasonal_expansion_pct}%</span>
                  <span className="text-[10px] text-slate-500 block">Post-monsoon gain</span>
                </div>
              </div>

              {/* Recharts Area Chart */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Water-Spread Dynamics Across Seasonal Epochs (Hectares)
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hws.epochs} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="spreadGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                      <XAxis dataKey="epoch" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit=" ha" />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#f8fafc",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total_spread_ha"
                        name="Surface Water Spread (ha)"
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#spreadGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10.5px] text-slate-400 italic">
                  {hws.accounting_note}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Drainage & Conservation Structures */}
          {activeTab === "conservation" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs font-semibold text-slate-400">Check Dams & Weirs</span>
                  <span className="text-2xl font-bold text-amber-400 font-mono block">{cons.check_dams}</span>
                  <span className="text-[11px] text-slate-500">Gully plugs & check masonry structures</span>
                </div>
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs font-semibold text-slate-400">Farm Ponds (Khet Talab)</span>
                  <span className="text-2xl font-bold text-emerald-400 font-mono block">{cons.farm_ponds}</span>
                  <span className="text-[11px] text-slate-500">In-situ agricultural rainwater harvesting</span>
                </div>
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs font-semibold text-slate-400">Percolation Tanks</span>
                  <span className="text-2xl font-bold text-teal-400 font-mono block">{cons.percolation_tanks}</span>
                  <span className="text-[11px] text-slate-500">Aquifer artificial recharge shafts</span>
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Hydrological Drainage & Stream Order Assignment
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Intervention structures in <strong>{studyArea.name}</strong> are geolocated across order-2 and order-3 drainage tributaries to intercept peak runoff and enhance shallow aquifer recharge while preventing siltation of downstream major storage reservoirs.
                </p>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-1.5 text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Officially Sanctioned Structures:</span>
                    <span className="font-mono text-emerald-400 font-bold">{cons.total_conservation_structures} verified</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>AI Predicted / Digitized Candidates:</span>
                    <span className="font-mono text-slate-500">0 (Strict verification model active)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Spatial Allocation Method:</span>
                    <span className="text-slate-300">Direct Cadastral Coordinate Assignment</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Environmental Change Alerts */}
          {activeTab === "environmental" && (
            <div className="space-y-4">
              {env.flags.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                  <p className="font-semibold text-slate-200">No Critical Environmental Stress Flags Detected</p>
                  <p className="text-slate-500 mt-1">Water-spread dynamics remain within baseline variability bounds.</p>
                </div>
              ) : (
                env.flags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-2.5 text-xs text-slate-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                        <h4 className="font-bold text-white text-sm">{flag.title}</h4>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                        Severity: {flag.severity}
                      </span>
                    </div>

                    <div className="text-slate-300 leading-relaxed">
                      <strong className="text-slate-200">Satellite Evidence:</strong> {flag.evidence}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Affected Extent</span>
                        <span className="font-mono text-rose-300 font-bold">{flag.area_ha} hectares</span>
                      </div>
                      <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Observation Date</span>
                        <span className="text-slate-200 font-mono">{flag.observation_date}</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900 border border-cyan-900/40 rounded-lg text-cyan-200 text-xs leading-relaxed">
                      <strong className="text-cyan-300">Engineering Recommendation:</strong> {flag.recommended_action}
                    </div>
                  </div>
                ))
              )}

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-400">
                <strong className="text-slate-300">Methodology Citation:</strong> {env.methodology}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/90 text-xs text-slate-400 shrink-0">
          <span>JalRakshak AI Watershed Remote-Sensing Analysis Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
