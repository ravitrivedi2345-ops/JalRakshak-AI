import React, { useState } from "react";
import { MapLayerItem } from "./mapTypes";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

interface MapLegendProps {
  layers: MapLayerItem[];
  className?: string;
  defaultCollapsed?: boolean;
}

export function MapLegend({ layers, className = "", defaultCollapsed = true }: MapLegendProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const visibleLayers = layers.filter((l) => l.visible);

  if (visibleLayers.length === 0) return null;

  return (
    <div className={`max-w-xs transition-all pointer-events-auto ${className}`}>
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-200">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold bg-slate-950/80 hover:bg-slate-800/60 transition-colors border-b border-slate-800/80"
        >
          <div className="flex items-center gap-1.5">
            <Info size={13} className="text-cyan-400" />
            <span className="uppercase tracking-wider text-[11px]">Map Legend ({visibleLayers.length})</span>
          </div>
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {!collapsed && (
          <div className="p-2.5 space-y-2 max-h-48 overflow-y-auto custom-scrollbar text-xs">
            {visibleLayers.map((layer) => (
              <div key={layer.id} className="flex items-center gap-2">
                {/* Symbology indicator */}
                {layer.geometry_type === "Point" ? (
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-white/40 shadow-sm"
                    style={{ backgroundColor: layer.color }}
                  />
                ) : layer.geometry_type === "LineString" ? (
                  <span
                    className="w-4 h-1 shrink-0 rounded-full"
                    style={{ backgroundColor: layer.color }}
                  />
                ) : (
                  <span
                    className="w-3.5 h-3.5 rounded-sm shrink-0 border border-white/30"
                    style={{
                      backgroundColor: layer.fill_color !== "transparent" ? layer.fill_color : layer.border_color,
                      borderColor: layer.border_color
                    }}
                  />
                )}
                <span className="text-[11px] text-slate-300 truncate font-medium">
                  {layer.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MapLegend;
