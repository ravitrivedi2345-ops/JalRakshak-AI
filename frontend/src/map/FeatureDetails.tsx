import React from "react";
import { FeatureDetail } from "./mapTypes";
import {
  X,
  MapPin,
  Compass,
  Layers,
  Droplets,
  Wrench,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Maximize2,
  Copy,
  Check,
  Satellite
} from "lucide-react";

interface FeatureDetailsProps {
  feature: FeatureDetail | null;
  onClose: () => void;
  onZoomToFeature?: (feature: FeatureDetail) => void;
  onLaunchSatelliteChange?: (waterbodyId: string) => void;
}

export function FeatureDetails({
  feature,
  onClose,
  onZoomToFeature,
  onLaunchSatelliteChange
}: FeatureDetailsProps) {
  const [copied, setCopied] = React.useState(false);

  if (!feature) return null;

  const handleCopyCoords = () => {
    if (feature.center) {
      const coordStr = `${feature.center[1].toFixed(5)}, ${feature.center[0].toFixed(5)}`;
      navigator.clipboard.writeText(coordStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="absolute top-4 right-4 z-20 w-80 sm:w-96 bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden flex flex-col max-h-[85vh] text-slate-100 transition-all">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
              {feature.type || feature.category}
            </span>
            {feature.verified && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                <ShieldCheck size={12} />
                Verified
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-white truncate mt-1" title={feature.name}>
            {feature.name}
          </h3>
          <span className="text-[10px] font-mono text-slate-500 block truncate">
            ID: {feature.id}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          title="Close details"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body Details */}
      <div className="overflow-y-auto p-4 space-y-3.5 custom-scrollbar text-xs">
        {/* Photo Preview if Available */}
        {feature.photo_url && (
          <div className="rounded-xl overflow-hidden border border-slate-800 max-h-36 bg-slate-900 relative">
            <img
              src={feature.photo_url}
              alt={feature.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 right-2 bg-black/70 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-300">
              Ground Evidence Photo
            </div>
          </div>
        )}

        {/* Administrative Association Grid */}
        <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Administrative Hierarchy
          </span>
          <div className="grid grid-cols-2 gap-2 text-slate-300">
            {feature.state && (
              <div>
                <span className="text-slate-500 text-[10px] block">State</span>
                <strong className="text-white">{feature.state}</strong>
              </div>
            )}
            {feature.district && (
              <div>
                <span className="text-slate-500 text-[10px] block">District</span>
                <strong className="text-white">{feature.district}</strong>
              </div>
            )}
            {feature.watershed_id && (
              <div>
                <span className="text-slate-500 text-[10px] block">Watershed ID</span>
                <span className="font-mono text-cyan-300">{feature.watershed_id}</span>
              </div>
            )}
            {feature.status && (
              <div>
                <span className="text-slate-500 text-[10px] block">Inspection Status</span>
                <span className="font-semibold capitalize text-emerald-400">{feature.status}</span>
              </div>
            )}
          </div>
        </div>

        {/* Spatial Metrics (Area, Length, Capacity) */}
        <div className="grid grid-cols-2 gap-2">
          {feature.area_sq_km !== undefined && (
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Basin Area</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold text-cyan-400 font-mono">
                  {feature.area_sq_km.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">km²</span>
              </div>
            </div>
          )}

          {feature.area_hectares !== undefined && (
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Water Spread</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold text-cyan-400 font-mono">
                  {feature.area_hectares.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400">ha</span>
              </div>
            </div>
          )}

          {feature.mapped_length_km !== undefined && (
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Mapped Length</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold text-cyan-400 font-mono">
                  {feature.mapped_length_km.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-400">km</span>
              </div>
            </div>
          )}

          {feature.capacity_m3 !== undefined && (
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Storage Capacity</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold text-amber-400 font-mono">
                  {feature.capacity_m3.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">m³</span>
              </div>
            </div>
          )}
        </div>

        {/* Coordinates Row */}
        {feature.center && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                Centroid Coordinates
              </span>
              <span className="font-mono text-white text-xs">
                {feature.center[1].toFixed(4)}°N, {feature.center[0].toFixed(4)}°E
              </span>
            </div>
            <button
              onClick={handleCopyCoords}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
              title="Copy Coordinates"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        )}

        {/* Sub-watersheds List if Watershed */}
        {feature.sub_watersheds && feature.sub_watersheds.length > 0 && (
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Sub-Watersheds / Micro-Catchments
            </span>
            <div className="flex flex-wrap gap-1">
              {feature.sub_watersheds.map((sw, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700"
                >
                  {sw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Data Source & License Provenance */}
        <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>Data Source:</span>
            <strong className="text-slate-300 truncate max-w-[180px]">{feature.source || "Survey of India / India-WRIS"}</strong>
          </div>
          {feature.license && (
            <div className="flex justify-between">
              <span>License:</span>
              <span className="text-slate-400">{feature.license}</span>
            </div>
          )}
          {feature.updated_at && (
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span className="font-mono text-slate-500">{feature.updated_at.split("T")[0]}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-2">
        {onZoomToFeature && (
          <button
            onClick={() => onZoomToFeature(feature)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium transition-colors"
          >
            <Maximize2 size={13} />
            <span>Zoom In</span>
          </button>
        )}

        {feature.can_launch_satellite_change && onLaunchSatelliteChange && (
          <button
            onClick={() => onLaunchSatelliteChange(feature.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white font-semibold transition-colors shadow-md"
          >
            <Satellite size={13} />
            <span>Satellite Change</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default FeatureDetails;
