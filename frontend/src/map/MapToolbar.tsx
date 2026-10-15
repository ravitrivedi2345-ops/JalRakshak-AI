import React from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Compass,
  RotateCcw,
  Layers,
  MapPin,
  Box
} from "lucide-react";

interface MapToolbarProps {
  zoom: number;
  pitch: number;
  bearing: number;
  cursorCoords: [number, number] | null;
  isFullscreen: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onToggleFullscreen: () => void;
  onToggle3D: () => void;
  onResetBearing: () => void;
  onToggleLayerControl?: () => void;
  isLayerControlOpen?: boolean;
}

export const MapToolbar: React.FC<MapToolbarProps> = ({
  zoom,
  pitch,
  bearing,
  cursorCoords,
  isFullscreen,
  onZoomIn,
  onZoomOut,
  onResetView,
  onToggleFullscreen,
  onToggle3D,
  onResetBearing,
  onToggleLayerControl,
  isLayerControlOpen
}) => {
  return (
    <div className="flex flex-col items-end gap-2 pointer-events-none select-none">
      {/* Live Coordinates Pill */}
      {cursorCoords && (
        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700/60 text-slate-300 text-xs px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 font-mono">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            {cursorCoords[1].toFixed(4)}°N, {cursorCoords[0].toFixed(4)}°E
          </span>
          <span className="text-slate-500 font-sans">|</span>
          <span className="text-slate-400 font-sans">z{zoom.toFixed(1)}</span>
        </div>
      )}

      {/* Main Action Buttons Cluster */}
      <div className="pointer-events-auto flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-800">
        {/* Zoom In */}
        <button
          type="button"
          onClick={onZoomIn}
          title="Zoom In (+)"
          className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={onZoomOut}
          title="Zoom Out (-)"
          className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Compass / Reset Bearing */}
        <button
          type="button"
          onClick={onResetBearing}
          title="Reset North Orientation"
          className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors relative group"
          aria-label="Reset North"
        >
          <Compass
            className="w-4 h-4 transition-transform duration-300"
            style={{ transform: `rotate(${-bearing}deg)` }}
          />
          {bearing !== 0 && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        {/* 3D Tilt Toggle */}
        <button
          type="button"
          onClick={onToggle3D}
          title={pitch > 10 ? "Switch to 2D Top View" : "Tilt to 3D Terrain Perspective (45°)"}
          className={`p-2.5 transition-colors ${
            pitch > 10
              ? "text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50"
              : "text-slate-300 hover:text-white hover:bg-slate-800"
          }`}
          aria-label="Toggle 3D View"
        >
          <Box className="w-4 h-4" />
        </button>

        {/* Reset to Default View */}
        <button
          type="button"
          onClick={onResetView}
          title="Reset to Full India View"
          className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Reset to India view"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      {/* Layer Toggle for Mobile / Quick Access */}
      {onToggleLayerControl && (
        <button
          type="button"
          onClick={onToggleLayerControl}
          title="GIS Layers"
          className={`pointer-events-auto p-2.5 rounded-xl shadow-xl border backdrop-blur-md transition-all sm:hidden ${
            isLayerControlOpen
              ? "bg-emerald-600 border-emerald-500 text-white"
              : "bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white"
          }`}
          aria-label="Toggle GIS Layers"
        >
          <Layers className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
