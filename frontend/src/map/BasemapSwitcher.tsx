import React from "react";
import { BasemapStyle } from "./mapTypes";
import { Map, Globe, Mountain, Moon } from "lucide-react";

interface BasemapSwitcherProps {
  currentBasemap?: BasemapStyle;
  activeBasemap?: BasemapStyle;
  onChangeBasemap: (basemap: BasemapStyle) => void;
}

const BASEMAP_OPTIONS: { id: BasemapStyle; label: string; icon: typeof Map; desc: string }[] = [
  { id: "streets", label: "Streets", icon: Map, desc: "Esri World Street Map (No key required)" },
  { id: "satellite", label: "Satellite", icon: Globe, desc: "Esri High-Resolution World Imagery" },
  { id: "topo", label: "Terrain", icon: Mountain, desc: "Esri World Topographic Map" },
  { id: "dark", label: "Dark", icon: Moon, desc: "Esri World Dark Gray Canvas" }
];

export function BasemapSwitcher({ currentBasemap, activeBasemap, onChangeBasemap }: BasemapSwitcherProps) {
  const selected = activeBasemap || currentBasemap || "streets";
  return (
    <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl">
      {BASEMAP_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = selected === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChangeBasemap(opt.id)}
            title={opt.desc}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isActive
                ? "bg-cyan-500 text-slate-950 shadow-md font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default BasemapSwitcher;
