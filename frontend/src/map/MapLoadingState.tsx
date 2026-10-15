import React from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";

interface MapLoadingStateProps {
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  message?: string;
}

export const MapLoadingState: React.FC<MapLoadingStateProps> = ({
  isLoading,
  error,
  onRetry,
  message = "Loading GIS watershed layers..."
}) => {
  if (!isLoading && !error) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center p-4">
      {isLoading && (
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-5 shadow-2xl flex items-center gap-3.5 max-w-sm">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-100">{message}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Hydrological network, administrative bounds &amp; waterbodies
            </p>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-red-500/40 rounded-2xl p-6 shadow-2xl max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-500/30 flex items-center justify-center mx-auto mb-3 text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h4 className="text-base font-semibold text-slate-100 mb-1">
            GIS Data Connection Notice
          </h4>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            {error} (Offline fallback datasets are active).
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
          )}
        </div>
      )}
    </div>
  );
};
