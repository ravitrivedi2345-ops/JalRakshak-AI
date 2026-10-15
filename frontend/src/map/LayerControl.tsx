import React, { useState } from "react";
import { MapLayerItem, LayerCategory } from "./mapTypes";
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Sliders,
  ExternalLink,
  Shield,
  Droplets,
  Wrench,
  Check,
  RotateCcw
} from "lucide-react";

interface LayerControlProps {
  layers: MapLayerItem[];
  onToggleLayer: (layerId: string) => void;
  onChangeOpacity?: (layerId: string, opacity: number) => void;
  onOpacityChange?: (layerId: string, opacity: number) => void;
  onResetAllLayers?: () => void;
  onResetVisibility?: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

const CATEGORY_METADATA: Record<
  LayerCategory,
  { label: string; icon: typeof Shield; color: string; description: string }
> = {
  administrative: {
    label: "Administrative Boundaries",
    icon: Shield,
    color: "#cbd5e1",
    description: "National, State, and District jurisdictions"
  },
  hydrological: {
    label: "Hydrological Networks",
    icon: Droplets,
    color: "#38bdf8",
    description: "Watersheds, river networks, drainage & waterbodies"
  },
  interventions: {
    label: "Watershed Interventions",
    icon: Wrench,
    color: "#f59e0b",
    description: "Check dams, farm ponds, percolation tanks & recharge"
  }
};

export function LayerControl({
  layers,
  onToggleLayer,
  onChangeOpacity,
  onOpacityChange,
  onResetAllLayers,
  onResetVisibility,
  isOpen,
  onToggleOpen
}: LayerControlProps) {
  const handleOpacity = onOpacityChange || onChangeOpacity || (() => {});
  const handleReset = onResetVisibility || onResetAllLayers || (() => {});
  const [expandedCategories, setExpandedCategories] = useState<Record<LayerCategory, boolean>>({
    administrative: true,
    hydrological: true,
    interventions: true
  });

  const [expandedOpacityId, setExpandedOpacityId] = useState<string | null>(null);

  const toggleCategory = (cat: LayerCategory) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const categories: LayerCategory[] = ["administrative", "hydrological", "interventions"];

  const activeCount = layers.filter((l) => l.visible).length;

  return (
    <div
      className={`absolute top-4 left-4 z-20 transition-all duration-300 ${
        isOpen ? "w-80 sm:w-88" : "w-auto"
      }`}
    >
      {/* Toggle Button when collapsed */}
      {!isOpen && (
        <button
          onClick={onToggleOpen}
          className="flex items-center gap-2 bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-slate-700/80 px-3.5 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs font-bold transition-all active:scale-95"
          title="Open GIS Layer Manager"
        >
          <Layers size={16} className="text-cyan-400" />
          <span>GIS Layers</span>
          <span className="px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 font-mono text-[10px] border border-cyan-800">
            {activeCount}/{layers.length}
          </span>
        </button>
      )}

      {/* Expanded Layer Panel */}
      {isOpen && (
        <div className="bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col max-h-[85vh] overflow-hidden text-slate-100">
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 border-b border-slate-800/80 bg-slate-900/80">
            <div className="flex items-center gap-2">
              <Layers size={17} className="text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                GIS Layer Control
              </h3>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded font-mono border border-cyan-800">
                {activeCount} Active
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Reset to default visibility"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={onToggleOpen}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Collapse layer panel"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Layer Categories List */}
          <div className="overflow-y-auto p-3 space-y-3 flex-1 custom-scrollbar">
            {categories.map((cat) => {
              const catMeta = CATEGORY_METADATA[cat];
              const CatIcon = catMeta.icon;
              const catLayers = layers.filter((l) => l.category === cat);
              const isExpanded = expandedCategories[cat];
              const catActiveCount = catLayers.filter((l) => l.visible).length;

              return (
                <div key={cat} className="rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
                  {/* Category Header */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center justify-between p-2.5 text-left bg-slate-900/80 hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CatIcon size={14} style={{ color: catMeta.color }} />
                      <span className="text-xs font-semibold text-slate-200">
                        {catMeta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">
                        {catActiveCount}/{catLayers.length}
                      </span>
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={14} className="text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Category Layer Rows */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-800/50 p-1">
                      {catLayers.map((layer) => {
                        const isOpacityOpen = expandedOpacityId === layer.id;

                        return (
                          <div key={layer.id} className="p-2 space-y-1.5 transition-colors hover:bg-slate-800/30 rounded-lg">
                            <div className="flex items-center justify-between gap-2">
                              {/* Layer Visibility Checkbox & Name */}
                              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={layer.visible}
                                  onChange={() => onToggleLayer(layer.id)}
                                  className="w-4 h-4 rounded accent-cyan-500 cursor-pointer bg-slate-800 border-slate-700"
                                />

                                {/* Symbology Swatch */}
                                <span
                                  className="w-3.5 h-3.5 rounded-sm inline-block shrink-0 border border-slate-700/60 shadow-sm"
                                  style={{
                                    backgroundColor:
                                      layer.geometry_type === "Polygon"
                                        ? layer.fill_color !== "transparent"
                                          ? layer.fill_color
                                          : layer.border_color
                                        : layer.color,
                                    borderRadius: layer.geometry_type === "Point" ? "50%" : "2px",
                                    borderWidth: layer.geometry_type === "LineString" ? "2px 0 0 0" : "1px",
                                    borderColor: layer.border_color || layer.color
                                  }}
                                />

                                <span
                                  className={`text-xs font-medium truncate ${
                                    layer.visible ? "text-slate-200" : "text-slate-500 line-through"
                                  }`}
                                  title={layer.name}
                                >
                                  {layer.name}
                                </span>
                              </label>

                              {/* Controls (Opacity Slider Toggle & Source Link) */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedOpacityId(isOpacityOpen ? null : layer.id)
                                  }
                                  className={`p-1 rounded text-slate-400 hover:text-white transition-colors ${
                                    isOpacityOpen ? "bg-slate-800 text-cyan-400" : ""
                                  }`}
                                  title="Adjust layer opacity"
                                >
                                  <Sliders size={13} />
                                </button>
                                {layer.source_url && (
                                  <a
                                    href={layer.source_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-slate-500 hover:text-slate-300"
                                    title={`Data source: ${layer.source}`}
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Opacity Slider Panel */}
                            {isOpacityOpen && (
                              <div className="pl-6 pr-2 pt-1 pb-1 text-[11px] space-y-1 bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                                <div className="flex justify-between text-slate-400">
                                  <span>Opacity: {Math.round(layer.opacity * 100)}%</span>
                                  <span className="text-[10px] font-mono text-slate-500">
                                    {layer.geometry_type}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="0.05"
                                  max="1.0"
                                  step="0.05"
                                  value={layer.opacity}
                                  onChange={(e) =>
                                    handleOpacity(layer.id, parseFloat(e.target.value))
                                  }
                                  className="w-full h-1 accent-cyan-400 bg-slate-800 cursor-pointer rounded"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer with Data Provenance Citation */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Verified Spatial Sources: SOIN · CGWB · India-WRIS</span>
            <span className="font-mono text-cyan-400">WGS84</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LayerControl;
