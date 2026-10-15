import React, { useState, useMemo } from "react";
import {
  MapPin,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Eye,
  RotateCcw,
  Maximize2,
  X,
  Upload,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { StudyAreaItem, BoundaryValidationStatus } from "./mapTypes";

interface StudyAreaSelectorProps {
  studyAreas: StudyAreaItem[];
  selectedStudyArea: StudyAreaItem | null;
  onSelectStudyArea: (area: StudyAreaItem) => void;
  onClearStudyArea: () => void;
  onShowAllStudyAreas: () => void;
  onResetMap: () => void;
  onUploadBoundary?: (studyAreaId: string) => void;
  isCompact?: boolean;
}

export default function StudyAreaSelector({
  studyAreas,
  selectedStudyArea,
  onSelectStudyArea,
  onClearStudyArea,
  onShowAllStudyAreas,
  onResetMap,
  onUploadBoundary,
  isCompact = false,
}: StudyAreaSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredAreas = useMemo(() => {
    let result = studyAreas;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.region.toLowerCase().includes(q) ||
          a.aliases.some((al) => al.toLowerCase().includes(q)) ||
          a.purpose.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") {
      result = result.filter((a) => a.boundary_status === filterStatus);
    }
    return result;
  }, [studyAreas, searchQuery, filterStatus]);

  const getStatusBadge = (status: BoundaryValidationStatus) => {
    switch (status) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 size={11} className="text-emerald-400" />
            VERIFIED BOUNDARY
          </span>
        );
      case "pending_verification":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertTriangle size={11} className="text-amber-400" />
            PENDING VERIFICATION
          </span>
        );
      case "sample_curated":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Info size={11} className="text-sky-400" />
            PROVISIONAL / SAMPLE
          </span>
        );
      case "verified_custom":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <CheckCircle2 size={11} className="text-purple-400" />
            ADMIN VERIFIED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
            <HelpCircle size={11} />
            UNVERIFIED
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-xl text-slate-100 overflow-hidden transition-all">
      {/* Header bar */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between gap-2 flex-wrap bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <MapPin size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Study Area Selector
              </h3>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-teal-400 font-mono font-medium border border-slate-700">
                6 PRESETS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Predefined watershed study regions across India with verified boundaries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedStudyArea && (
            <button
              type="button"
              onClick={onClearStudyArea}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-colors"
              title="Clear currently selected study area"
            >
              <X size={12} />
              Clear Area
            </button>
          )}

          <button
            type="button"
            onClick={onShowAllStudyAreas}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Zoom out to show all 6 study areas across India"
          >
            <Maximize2 size={12} className="text-cyan-400" />
            Show All Areas
          </button>

          <button
            type="button"
            onClick={onResetMap}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Reset map view to default India extent"
          >
            <RotateCcw size={12} className="text-amber-400" />
            Reset Map
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            aria-label={isExpanded ? "Collapse study areas" : "Expand study areas"}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Selected study area banner (always visible when selected) */}
      {selectedStudyArea && (
        <div className="px-3.5 py-2.5 bg-teal-950/40 border-b border-teal-800/40 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse shadow-sm shadow-teal-400" />
            <span className="text-xs text-slate-300">
              Active Focus:{" "}
              <strong className="text-teal-200 font-semibold">{selectedStudyArea.name}</strong>{" "}
              <span className="text-slate-400">({selectedStudyArea.region})</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {getStatusBadge(selectedStudyArea.boundary_status)}
            <span className="text-[11px] font-mono text-slate-400">
              {selectedStudyArea.area_sqkm.toLocaleString()} km²
            </span>
          </div>
        </div>
      )}

      {/* Search and filter controls */}
      {isExpanded && (
        <div className="p-3 border-b border-slate-800/60 flex items-center gap-2 flex-wrap bg-slate-900/60">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search study areas by name or alias (e.g. Kolar, Tungabhadra, Anantapur)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-slate-950/80 border border-slate-700/80 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs py-1.5 px-2 rounded-lg bg-slate-950/80 border border-slate-700/80 text-slate-300 focus:outline-none focus:border-teal-500"
            aria-label="Filter study areas by boundary validation status"
          >
            <option value="all">All Statuses ({studyAreas.length})</option>
            <option value="verified">Verified Boundaries Only</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="sample_curated">Provisional / Sample</option>
          </select>
        </div>
      )}

      {/* Study Area Cards Grid / List */}
      {isExpanded && (
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto custom-scrollbar">
          {filteredAreas.length === 0 ? (
            <div className="col-span-full py-6 text-center text-xs text-slate-400">
              No preset study areas match &quot;{searchQuery}&quot;. Try searching &quot;Kolar&quot;, &quot;Vidarbha&quot;, or &quot;Thar&quot;.
            </div>
          ) : (
            filteredAreas.map((area) => {
              const isSelected = selectedStudyArea?.id === area.id;
              return (
                <div
                  key={area.id}
                  className={`group relative rounded-lg border p-3 transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-teal-950/30 border-teal-500 shadow-md shadow-teal-950/50"
                      : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/30"
                  }`}
                >
                  <div>
                    {/* Top Row: Title & Status */}
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-teal-300 transition-colors flex items-center gap-1.5">
                          {area.name}
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                          )}
                        </h4>
                        <span className="text-[11px] text-teal-400 font-medium">
                          {area.region}
                        </span>
                      </div>
                      {getStatusBadge(area.boundary_status)}
                    </div>

                    {/* Short Description & Purpose */}
                    <p className="text-[11px] text-slate-300 line-clamp-2 mb-2 leading-relaxed">
                      {area.purpose}
                    </p>

                    {/* Disambiguation note if present */}
                    {area.disambiguation_notes && (
                      <div className="p-1.5 rounded bg-amber-950/25 border border-amber-800/40 text-[10px] text-amber-300 leading-tight mb-2">
                        <strong>Note:</strong> {area.disambiguation_notes}
                      </div>
                    )}

                    {/* Metadata chips */}
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400 mb-2">
                      <span className="inline-flex items-center gap-1">
                        <Layers size={10} className="text-slate-400" />
                        {area.area_sqkm.toLocaleString()} km²
                      </span>
                      <span>•</span>
                      <span>Streams: {area.layer_counts?.streams || 0}</span>
                      <span>•</span>
                      <span>Ponds: {area.layer_counts?.waterbodies || 0}</span>
                      <span>•</span>
                      <span>Interventions: {area.layer_counts?.interventions || 0}</span>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between gap-2 mt-auto">
                    <span className="text-[10px] text-slate-400 truncate max-w-[150px]" title={area.boundary_source || "Authoritative data"}>
                      Src: {area.boundary_source ? area.boundary_source.split("&")[0] : "CGWB / WRIS"}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {area.boundary_status === "pending_verification" && onUploadBoundary && (
                        <button
                          type="button"
                          onClick={() => onUploadBoundary(area.id)}
                          className="px-2 py-1 rounded text-[11px] font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1"
                          title="Upload verified boundary polygon (GeoJSON/Shapefile)"
                        >
                          <Upload size={10} />
                          Upload
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onSelectStudyArea(area)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                          isSelected
                            ? "bg-teal-500 text-slate-950 hover:bg-teal-400 shadow-sm shadow-teal-500/50"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600"
                        }`}
                      >
                        <Eye size={11} />
                        {isSelected ? "Focused" : "View on Map"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
