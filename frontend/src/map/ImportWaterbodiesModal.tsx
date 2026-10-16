import React, { useState } from "react";
import { X, Upload, CheckCircle2, AlertCircle, FileSpreadsheet, Waves } from "lucide-react";
import { importStudyAreaWaterbodies } from "./mapApi";

interface ImportWaterbodiesModalProps {
  studyAreaId: string;
  studyAreaName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
}

export default function ImportWaterbodiesModal({
  studyAreaId,
  studyAreaName,
  isOpen,
  onClose,
  onSuccess,
}: ImportWaterbodiesModalProps) {
  const [sourceCitation, setSourceCitation] = useState("State Wetland Authority / WRD Official Survey 2026");
  const [inputText, setInputText] = useState("");
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
        setInputText(content);
        setError(null);
      } catch {
        setError("Failed to read file.");
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSampleData = () => {
    // Generate sample verified records specific to the region
    const sample = [
      {
        name: `${studyAreaName} Percolation Tank #01`,
        waterbody_type: "tank",
        latitude: 22.85,
        longitude: 77.12,
        area_hectares: 2.4,
        inspection_status: "verified",
        priority: "medium",
        data_source: sourceCitation
      },
      {
        name: `${studyAreaName} Village Pond #02`,
        waterbody_type: "pond",
        latitude: 22.88,
        longitude: 77.16,
        area_hectares: 4.8,
        inspection_status: "verified",
        priority: "high",
        data_source: sourceCitation
      }
    ];
    setInputText(JSON.stringify(sample, null, 2));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!inputText.trim()) {
        throw new Error("Please paste GeoJSON/JSON array or upload a file.");
      }

      let items: any[] = [];
      const trimmed = inputText.trim();

      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          items = parsed;
        } else if (parsed.type === "FeatureCollection" && Array.isArray(parsed.features)) {
          items = parsed.features.map((f: any) => ({
            name: f.properties?.name || "Mapped Waterbody",
            waterbody_type: f.properties?.type || f.properties?.waterbody_type || "pond",
            latitude: f.geometry?.coordinates ? (f.geometry.type === "Point" ? f.geometry.coordinates[1] : f.geometry.coordinates[0][0][1]) : 25.0,
            longitude: f.geometry?.coordinates ? (f.geometry.type === "Point" ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0][0]) : 85.0,
            area_hectares: f.properties?.area_hectares || f.properties?.area_ha || 1.5,
            inspection_status: f.properties?.inspection_status || "verified",
            priority: f.properties?.priority || "medium",
            data_source: sourceCitation
          }));
        } else {
          throw new Error("JSON must be an array of records or a GeoJSON FeatureCollection.");
        }
      } else {
        // Parse CSV
        const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) throw new Error("CSV requires a header row and at least one data row.");
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const nameIdx = headers.findIndex((h) => h.includes("name"));
        const latIdx = headers.findIndex((h) => h.includes("lat"));
        const lonIdx = headers.findIndex((h) => h.includes("lon") || h.includes("lng"));
        const typeIdx = headers.findIndex((h) => h.includes("type"));
        const areaIdx = headers.findIndex((h) => h.includes("area"));

        if (latIdx === -1 || lonIdx === -1) {
          throw new Error("CSV must include 'latitude' and 'longitude' columns.");
        }

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
          const lat = parseFloat(cols[latIdx]);
          const lon = parseFloat(cols[lonIdx]);
          if (!isNaN(lat) && !isNaN(lon)) {
            items.push({
              name: nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : `Waterbody #${i}`,
              waterbody_type: typeIdx !== -1 && cols[typeIdx] ? cols[typeIdx] : "pond",
              latitude: lat,
              longitude: lon,
              area_hectares: areaIdx !== -1 && !isNaN(parseFloat(cols[areaIdx])) ? parseFloat(cols[areaIdx]) : 1.0,
              inspection_status: "verified",
              priority: "medium",
              data_source: sourceCitation
            });
          }
        }
      }

      if (items.length === 0) {
        throw new Error("No valid waterbody records extracted from input.");
      }

      const res = await importStudyAreaWaterbodies(studyAreaId, items, sourceCitation);
      if (res) {
        onSuccess(items.length);
        onClose();
      } else {
        throw new Error("Failed to save imported waterbodies.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || "Failed to parse or import records.");
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
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Waves size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Import Waterbody Records</h3>
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
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Authoritative Source / Citation
            </label>
            <input
              type="text"
              value={sourceCitation}
              onChange={(e) => setSourceCitation(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Waterbody Data (GeoJSON FeatureCollection, JSON array, or CSV)
              </label>
              <button
                type="button"
                onClick={handleLoadSampleData}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
              >
                Load Sample Template
              </button>
            </div>
            <textarea
              rows={6}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder='[{"name": "Site Pond A", "latitude": 22.85, "longitude": 77.10, "waterbody_type": "pond", "area_hectares": 3.2}]'
              className="w-full px-3 py-2 font-mono text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>Or upload file directly:</span>
            <label className="cursor-pointer px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition">
              <Upload size={13} />
              <span>Choose .geojson / .json / .csv</span>
              <input
                type="file"
                accept=".geojson,.json,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Importing...</span>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Import Records</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
