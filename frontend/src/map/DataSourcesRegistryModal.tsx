import React from "react";
import { X, ExternalLink, ShieldCheck, Database, Layers, Info } from "lucide-react";
import type { DataSourceMetadata } from "./mapTypes";

interface DataSourcesRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: DataSourceMetadata[];
}

export default function DataSourcesRegistryModal({
  isOpen,
  onClose,
  sources,
}: DataSourcesRegistryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[88vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-cyan-500 to-teal-400 rounded-xl text-slate-950 shadow-md shadow-cyan-500/20 font-bold">
              <Database size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Authoritative GIS & Remote Sensing Data Sources
              </h2>
              <p className="text-xs text-slate-400">
                Official national and state geospatial repositories, licensing terms, and metadata provenance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="p-3.5 bg-cyan-950/30 border border-cyan-800/50 rounded-xl flex items-start gap-3 text-xs text-cyan-200/90 leading-relaxed">
            <Info size={18} className="text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-cyan-300">Data Integrity & Compliance Policy:</strong> JalRakshak AI strictly ingests and displays geospatial data from verified governmental portals under the Government Open Data License (GODL-India) and fair academic/research terms. Unverified candidate features are explicitly separated from field-verified ground truth.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((src) => (
              <div
                key={src.id}
                className="p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl space-y-3 transition flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                      {src.id}
                    </span>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition"
                    >
                      <ExternalLink size={12} /> Portal
                    </a>
                  </div>

                  <h3 className="text-sm font-bold text-white leading-snug">{src.title}</h3>
                  <p className="text-xs text-slate-400 font-medium">Publisher: {src.publisher}</p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Spatial Resolution</span>
                      <span className="text-slate-200 font-medium">{src.spatial_resolution}</span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">CRS / Projection</span>
                      <span className="text-slate-200 font-mono font-medium">{src.crs}</span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Observation Epoch</span>
                      <span className="text-slate-200">{src.observation_date}</span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">License</span>
                      <span className="text-emerald-400 font-medium">{src.license}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1 pt-1">
                    <div>
                      <strong className="text-slate-300">Coverage:</strong> {src.geographic_coverage}
                    </div>
                    <div>
                      <strong className="text-slate-300">Attributes:</strong>{" "}
                      <span className="font-mono text-[10.5px] text-slate-400">
                        {src.attributes_provided.join(", ")}
                      </span>
                    </div>
                  </div>
                </div>

                {src.known_limitations && (
                  <div className="mt-2 p-2 bg-amber-950/20 border border-amber-800/30 rounded text-[10.5px] text-amber-200/80 leading-relaxed">
                    <strong className="text-amber-400">Known Limitations:</strong> {src.known_limitations}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/90 text-xs text-slate-400 shrink-0">
          <span>{sources.length} Authoritative GIS Portals Documented</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
