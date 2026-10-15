import React, { useState, useEffect, useRef } from "react";
import { SearchResultItem } from "./mapTypes";
import { searchMapFeatures } from "./mapApi";
import {
  Search,
  X,
  MapPin,
  Compass,
  Droplets,
  Layers,
  Wrench,
  Navigation,
  Loader2,
  ChevronRight
} from "lucide-react";

interface GeographicSearchProps {
  onSelectResult: (result: SearchResultItem) => void;
}

const CATEGORY_ICONS: Record<string, typeof MapPin> = {
  state: Compass,
  district: MapPin,
  watershed: Layers,
  river: Droplets,
  waterbody: Droplets,
  intervention: Wrench,
  coordinate: Navigation
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  state: { bg: "bg-purple-950/70", text: "text-purple-300", border: "border-purple-800" },
  district: { bg: "bg-blue-950/70", text: "text-blue-300", border: "border-blue-800" },
  watershed: { bg: "bg-cyan-950/70", text: "text-cyan-300", border: "border-cyan-800" },
  river: { bg: "bg-sky-950/70", text: "text-sky-300", border: "border-sky-800" },
  waterbody: { bg: "bg-emerald-950/70", text: "text-emerald-300", border: "border-emerald-800" },
  intervention: { bg: "bg-amber-950/70", text: "text-amber-300", border: "border-amber-800" },
  coordinate: { bg: "bg-rose-950/70", text: "text-rose-300", border: "border-rose-800" }
};

export function GeographicSearch({ onSelectResult }: GeographicSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<any>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await searchMapFeatures(query, 12);
        setResults(res);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: SearchResultItem) => {
    onSelectResult(item);
    setQuery(item.title);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Search Bar Input */}
      <div className="relative flex items-center bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden transition-all focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20">
        <span className="pl-3.5 pr-2 text-slate-400">
          {loading ? (
            <Loader2 size={16} className="animate-spin text-cyan-400" />
          ) : (
            <Search size={16} className="text-cyan-400" />
          )}
        </span>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Search State, District, Watershed, River, or Lat,Lon..."
          className="w-full bg-transparent py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none font-medium"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 mr-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-30 max-h-80 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar text-xs">
          {results.length > 0 ? (
            results.map((item) => {
              const Icon = CATEGORY_ICONS[item.category] || MapPin;
              const style = CATEGORY_COLORS[item.category] || {
                bg: "bg-slate-800",
                text: "text-slate-300",
                border: "border-slate-700"
              };

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-900/80 transition-colors group"
                >
                  <div className="flex items-start gap-2.5 min-w-0 pr-2">
                    <span
                      className={`p-1.5 rounded-lg border mt-0.5 shrink-0 ${style.bg} ${style.border} ${style.text}`}
                    >
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                          {item.title}
                        </span>
                        <span
                          className={`text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.2 rounded border ${style.bg} ${style.border} ${style.text}`}
                        >
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-500 group-hover:text-cyan-400 shrink-0 transition-colors" />
                </button>
              );
            })
          ) : (
            <div className="p-4 text-center text-slate-400 text-xs space-y-1">
              <p className="font-semibold text-slate-300">No matching geographic features</p>
              <p className="text-[11px] text-slate-500">
                Try searching for 'Patna', 'Bihar', 'Luni', 'Check Dam', or coordinates '25.5941, 85.1376'
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GeographicSearch;
