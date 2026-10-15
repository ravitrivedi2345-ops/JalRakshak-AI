import React, { useState } from "react";
import { X, Upload, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { uploadStudyAreaBoundary } from "./mapApi";

interface UploadBoundaryModalProps {
  studyAreaId: string;
  studyAreaName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedFeature: any) => void;
}

export default function UploadBoundaryModal({
  studyAreaId,
  studyAreaName,
  isOpen,
  onClose,
  onSuccess,
}: UploadBoundaryModalProps) {
  const [sourceLabel, setSourceLabel] = useState("Official State Remote Sensing Center GIS Layer");
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setJsonText(content);
        setError(null);
      } catch {
        setError("Failed to read file.");
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!jsonText.trim()) {
        throw new Error("Please paste GeoJSON or choose a .geojson file.");
      }

      const parsed = JSON.parse(jsonText);
      let coordinates: number[][][] | null = null;

      if (parsed.type === "Feature" && parsed.geometry?.type === "Polygon") {
        coordinates = parsed.geometry.coordinates;
      } else if (parsed.type === "Polygon") {
        coordinates = parsed.coordinates;
      } else if (parsed.type === "FeatureCollection" && parsed.features?.[0]?.geometry?.type === "Polygon") {
        coordinates = parsed.features[0].geometry.coordinates;
      }

      if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
        throw new Error("Invalid GeoJSON. Must contain a Polygon geometry with linear ring coordinates.");
      }

      const updated = await uploadStudyAreaBoundary(studyAreaId, coordinates, sourceLabel);
      if (updated) {
        onSuccess(updated);
        onClose();
      } else {
        throw new Error("Server rejected uploaded boundary.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || "Failed to parse or upload boundary.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Upload size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Upload Verified Boundary</h3>
              <p className="text-xs text-slate-400">{studyAreaName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Authoritative Source / Citation Label
            </label>
            <input
              type="text"
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-teal-500"
              placeholder="e.g. SLUSI 2026 Survey, CGWB Ken-Betwa Report"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Select .geojson File or Paste JSON
            </label>
            <div className="flex items-center gap-2 mb-2">
              <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs cursor-pointer flex items-center gap-1.5 font-medium transition-colors">
                <FileText size={14} className="text-teal-400" />
                Browse File...
                <input
                  type="file"
                  accept=".geojson,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-slate-400">Accepts GeoJSON Feature or Polygon</span>
            </div>

            <textarea
              rows={6}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='Paste GeoJSON here: { "type": "Polygon", "coordinates": [...] }'
              className="w-full text-xs font-mono p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-teal-500 custom-scrollbar"
            />
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 text-slate-950 hover:bg-teal-400 disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              {loading ? "Verifying..." : "Confirm & Save Boundary"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
