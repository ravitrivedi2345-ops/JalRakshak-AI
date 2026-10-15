import React, { useEffect, useRef, useState, useCallback } from "react";
import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { MapLayerItem, BasemapStyle, FeatureDetail, SearchResultItem } from "./mapTypes";

interface MapCanvasProps {
  basemap: BasemapStyle;
  layers: MapLayerItem[];
  selectedFeature: FeatureDetail | null;
  onSelectFeature: (feature: FeatureDetail | null) => void;
  onCursorMove: (coords: [number, number] | null) => void;
  onMapStateChange: (state: { zoom: number; pitch: number; bearing: number }) => void;
  administrativeData: any;
  watershedsData: any;
  hydrologyData: any;
  interventionsData: any;
  navigationTarget: { center: [number, number]; zoom: number; bounds?: [[number, number], [number, number]] } | null;
  mapInstanceRef?: React.MutableRefObject<MapLibreMap | null>;
}

// Tile endpoints for basemaps
const BASEMAP_TILES: Record<BasemapStyle, { url: string; attribution: string; maxzoom: number }> = {
  streets: {
    url: "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    maxzoom: 19
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
    maxzoom: 19
  },
  topo: {
    url: "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap",
    maxzoom: 17
  },
  dark: {
    url: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    maxzoom: 19
  }
};

export const MapCanvas: React.FC<MapCanvasProps> = ({
  basemap,
  layers,
  selectedFeature,
  onSelectFeature,
  onCursorMove,
  onMapStateChange,
  administrativeData,
  watershedsData,
  hydrologyData,
  interventionsData,
  navigationTarget,
  mapInstanceRef
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Default center on India
  const DEFAULT_CENTER: [number, number] = [80.9462, 23.5937];
  const DEFAULT_ZOOM = 4.8;

  // 1. Initialize Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      const { Map, ScaleControl, AttributionControl, Popup, setWorkerUrl } = await import("maplibre-gl");
      setWorkerUrl(maplibreWorkerUrl);

      // Create base style with raster sources for all 4 basemaps
      const styleSpec: any = {
        version: 8,
        sources: {
          "source-streets": {
            type: "raster",
            tiles: [BASEMAP_TILES.streets.url],
            tileSize: 256,
            attribution: BASEMAP_TILES.streets.attribution,
            maxzoom: BASEMAP_TILES.streets.maxzoom
          },
          "source-satellite": {
            type: "raster",
            tiles: [BASEMAP_TILES.satellite.url],
            tileSize: 256,
            attribution: BASEMAP_TILES.satellite.attribution,
            maxzoom: BASEMAP_TILES.satellite.maxzoom
          },
          "source-topo": {
            type: "raster",
            tiles: [BASEMAP_TILES.topo.url],
            tileSize: 256,
            attribution: BASEMAP_TILES.topo.attribution,
            maxzoom: BASEMAP_TILES.topo.maxzoom
          },
          "source-dark": {
            type: "raster",
            tiles: [BASEMAP_TILES.dark.url],
            tileSize: 256,
            attribution: BASEMAP_TILES.dark.attribution,
            maxzoom: BASEMAP_TILES.dark.maxzoom
          }
        },
        layers: [
          {
            id: "basemap-streets",
            type: "raster",
            source: "source-streets",
            layout: { visibility: basemap === "streets" ? "visible" : "none" }
          },
          {
            id: "basemap-satellite",
            type: "raster",
            source: "source-satellite",
            layout: { visibility: basemap === "satellite" ? "visible" : "none" }
          },
          {
            id: "basemap-topo",
            type: "raster",
            source: "source-topo",
            layout: { visibility: basemap === "topo" ? "visible" : "none" }
          },
          {
            id: "basemap-dark",
            type: "raster",
            source: "source-dark",
            layout: { visibility: basemap === "dark" ? "visible" : "none" }
          }
        ]
      };

      const map = new Map({
        container: containerRef.current,
        style: styleSpec,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: 0,
        bearing: 0,
        attributionControl: false
      });

      // Add attribution and scale bar
      map.addControl(new AttributionControl({ compact: true }), "bottom-right");
      map.addControl(new ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");

      popupRef.current = new Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        className: "jal-map-tooltip"
      });

      map.on("load", () => {
        if (!isMounted) return;
        mapRef.current = map;
        if (mapInstanceRef) mapInstanceRef.current = map;
        setIsMapReady(true);
      });

      const handleMove = () => {
        onMapStateChange({
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing()
        });
      };

      map.on("move", handleMove);

      map.on("mousemove", (e) => {
        onCursorMove([e.lngLat.lng, e.lngLat.lat]);
      });

      map.on("mouseout", () => {
        onCursorMove(null);
      });
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        if (mapInstanceRef) mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Basemap Switcher Update
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const basemaps: BasemapStyle[] = ["streets", "satellite", "topo", "dark"];
    basemaps.forEach((b) => {
      const layerId = `basemap-${b}`;
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", b === basemap ? "visible" : "none");
      }
    });
  }, [basemap, isMapReady]);

  // 3. Setup and Update Vector Sources & Layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    // Helper to safely add or update GeoJSON source
    const setGeoJsonSource = (sourceId: string, data: any, cluster: boolean = false) => {
      const existing = map.getSource(sourceId) as GeoJSONSource | undefined;
      const validData = data && data.features ? data : { type: "FeatureCollection", features: [] };

      if (existing) {
        existing.setData(validData);
      } else {
        map.addSource(sourceId, {
          type: "geojson",
          data: validData,
          cluster: cluster,
          clusterMaxZoom: 12,
          clusterRadius: 40
        });
      }
    };

    // Filter Administrative sub-collections
    const nationalFeatures = {
      type: "FeatureCollection",
      features: (administrativeData?.features || []).filter(
        (f: any) => f.properties?.boundary_type === "national" || f.id === "ind-national"
      )
    };
    const stateFeatures = {
      type: "FeatureCollection",
      features: (administrativeData?.features || []).filter(
        (f: any) => f.properties?.boundary_type === "state" || f.properties?.type === "state"
      )
    };
    const districtFeatures = {
      type: "FeatureCollection",
      features: (administrativeData?.features || []).filter(
        (f: any) => f.properties?.boundary_type === "district" || f.properties?.type === "district"
      )
    };

    // Hydrological sub-collections
    const rivers = {
      type: "FeatureCollection",
      features: (hydrologyData?.features || []).filter(
        (f: any) => f.properties?.type === "river" || f.properties?.hydrology_type === "river"
      )
    };
    const drainage = {
      type: "FeatureCollection",
      features: (hydrologyData?.features || []).filter(
        (f: any) => f.properties?.type === "drainage" || f.properties?.hydrology_type === "drainage"
      )
    };
    const waterbodies = {
      type: "FeatureCollection",
      features: (hydrologyData?.features || []).filter(
        (f: any) =>
          f.properties?.type === "waterbody" ||
          f.properties?.type === "lake" ||
          f.properties?.type === "pond" ||
          f.properties?.type === "reservoir" ||
          f.properties?.hydrology_type === "waterbody"
      )
    };

    // Interventions: points vs traditional lines
    const interventionPoints = {
      type: "FeatureCollection",
      features: (interventionsData?.features || []).filter((f: any) => f.geometry?.type === "Point")
    };
    const interventionLines = {
      type: "FeatureCollection",
      features: (interventionsData?.features || []).filter(
        (f: any) => f.geometry?.type === "LineString" || f.geometry?.type === "MultiLineString"
      )
    };

    // Add or update all sources
    setGeoJsonSource("src-admin-national", nationalFeatures);
    setGeoJsonSource("src-admin-states", stateFeatures);
    setGeoJsonSource("src-admin-districts", districtFeatures);
    setGeoJsonSource("src-watersheds", watershedsData);
    setGeoJsonSource("src-rivers", rivers);
    setGeoJsonSource("src-drainage", drainage);
    setGeoJsonSource("src-waterbodies", waterbodies);
    setGeoJsonSource("src-interventions-points", interventionPoints, true);
    setGeoJsonSource("src-interventions-lines", interventionLines, false);

    // Add Layers if not present

    // 1. National Boundary (line)
    if (!map.getLayer("layer-admin-national")) {
      map.addLayer({
        id: "layer-admin-national",
        type: "line",
        source: "src-admin-national",
        paint: {
          "line-color": "#e2e8f0",
          "line-width": 2.2,
          "line-opacity": 0.95
        }
      });
    }

    // 2. Watershed Boundaries (fill + line)
    if (!map.getLayer("layer-watersheds-fill")) {
      map.addLayer({
        id: "layer-watersheds-fill",
        type: "fill",
        source: "src-watersheds",
        paint: {
          "fill-color": "#0d9488",
          "fill-opacity": 0.2
        }
      });
    }
    if (!map.getLayer("layer-watersheds-line")) {
      map.addLayer({
        id: "layer-watersheds-line",
        type: "line",
        source: "src-watersheds",
        paint: {
          "line-color": "#14b8a6",
          "line-width": 1.8,
          "line-dasharray": [3, 2],
          "line-opacity": 0.85
        }
      });
    }

    // 3. State Boundaries (fill + line)
    if (!map.getLayer("layer-admin-states-fill")) {
      map.addLayer({
        id: "layer-admin-states-fill",
        type: "fill",
        source: "src-admin-states",
        paint: {
          "fill-color": "#334155",
          "fill-opacity": 0.2
        }
      });
    }
    if (!map.getLayer("layer-admin-states-line")) {
      map.addLayer({
        id: "layer-admin-states-line",
        type: "line",
        source: "src-admin-states",
        paint: {
          "line-color": "#64748b",
          "line-width": 1.4,
          "line-opacity": 0.75
        }
      });
    }

    // 4. District Boundaries (fill + line)
    if (!map.getLayer("layer-admin-districts-fill")) {
      map.addLayer({
        id: "layer-admin-districts-fill",
        type: "fill",
        source: "src-admin-districts",
        paint: {
          "fill-color": "#1e293b",
          "fill-opacity": 0.25
        }
      });
    }
    if (!map.getLayer("layer-admin-districts-line")) {
      map.addLayer({
        id: "layer-admin-districts-line",
        type: "line",
        source: "src-admin-districts",
        paint: {
          "line-color": "#94a3b8",
          "line-width": 1.0,
          "line-dasharray": [2, 1],
          "line-opacity": 0.8
        }
      });
    }

    // 5. Drainage lines
    if (!map.getLayer("layer-drainage")) {
      map.addLayer({
        id: "layer-drainage",
        type: "line",
        source: "src-drainage",
        paint: {
          "line-color": "#38bdf8",
          "line-width": 1.5,
          "line-dasharray": [2, 2],
          "line-opacity": 0.7
        }
      });
    }

    // 6. Major Rivers
    if (!map.getLayer("layer-rivers")) {
      map.addLayer({
        id: "layer-rivers",
        type: "line",
        source: "src-rivers",
        paint: {
          "line-color": "#0284c7",
          "line-width": 3.2,
          "line-opacity": 0.95
        }
      });
    }

    // 7. Waterbodies (fill + line)
    if (!map.getLayer("layer-waterbodies-fill")) {
      map.addLayer({
        id: "layer-waterbodies-fill",
        type: "fill",
        source: "src-waterbodies",
        paint: {
          "fill-color": "#0284c7",
          "fill-opacity": 0.65
        }
      });
    }
    if (!map.getLayer("layer-waterbodies-line")) {
      map.addLayer({
        id: "layer-waterbodies-line",
        type: "line",
        source: "src-waterbodies",
        paint: {
          "line-color": "#38bdf8",
          "line-width": 1.8,
          "line-opacity": 0.9
        }
      });
    }

    // 8. Traditional Interventions (Lines)
    if (!map.getLayer("layer-interventions-lines")) {
      map.addLayer({
        id: "layer-interventions-lines",
        type: "line",
        source: "src-interventions-lines",
        paint: {
          "line-color": "#ec4899",
          "line-width": 2.5,
          "line-opacity": 0.85
        }
      });
    }

    // 9. Clustered Point Interventions
    if (!map.getLayer("layer-interventions-clusters")) {
      map.addLayer({
        id: "layer-interventions-clusters",
        type: "circle",
        source: "src-interventions-points",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#10b981",
            5,
            "#f59e0b",
            15,
            "#ec4899"
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            15,
            5,
            20,
            15,
            26
          ],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9
        }
      });
    }

    if (!map.getLayer("layer-interventions-count")) {
      map.addLayer({
        id: "layer-interventions-count",
        type: "symbol",
        source: "src-interventions-points",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 11,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"]
        },
        paint: {
          "text-color": "#ffffff"
        }
      });
    }

    // 10. Individual Point Interventions (Unclustered)
    if (!map.getLayer("layer-interventions-unclustered")) {
      map.addLayer({
        id: "layer-interventions-unclustered",
        type: "circle",
        source: "src-interventions-points",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "structure_type"],
            "check_dam",
            "#10b981",
            "farm_pond",
            "#f59e0b",
            "percolation_tank",
            "#8b5cf6",
            "#06b6d4"
          ],
          "circle-radius": 7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.95
        }
      });
    }

    // Click handler on Cluster to zoom in
    const handleClusterClick = (e: any) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["layer-interventions-clusters"] });
      const clusterId = features[0]?.properties?.cluster_id;
      const source = map.getSource("src-interventions-points") as any;

      if (source && clusterId !== undefined) {
        source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) return;
          map.easeTo({
            center: (features[0].geometry as any).coordinates,
            zoom: zoom + 0.5
          });
        });
      }
    };
    map.off("click", "layer-interventions-clusters", handleClusterClick);
    map.on("click", "layer-interventions-clusters", handleClusterClick);

    // Interactive Layers for feature selection & tooltips
    const interactiveLayerIds = [
      "layer-interventions-unclustered",
      "layer-interventions-lines",
      "layer-waterbodies-fill",
      "layer-rivers",
      "layer-watersheds-fill",
      "layer-admin-districts-fill",
      "layer-admin-states-fill"
    ];

    const handleFeatureClick = (e: any) => {
      const features = map.queryRenderedFeatures(e.point, { layers: interactiveLayerIds });
      if (!features.length) return;

      const feature = features[0];
      const props = feature.properties || {};

      const detail: FeatureDetail = {
        id: feature.id?.toString() || props.id || props.code || "unknown-feature",
        name: props.name || props.river_name || props.structure_name || "Feature",
        type: props.structure_type || props.type || props.boundary_type || "Feature",
        category: props.category || "geospatial",
        state: props.state,
        district: props.district,
        headquarters: props.headquarters,
        area_sq_km: props.area_sq_km ? Number(props.area_sq_km) : undefined,
        calculated_area_ha: props.calculated_area_ha ? Number(props.calculated_area_ha) : undefined,
        area_hectares: props.area_hectares ? Number(props.area_hectares) : undefined,
        mapped_length_km: props.mapped_length_km ? Number(props.mapped_length_km) : undefined,
        approx_length_km: props.approx_length_km ? Number(props.approx_length_km) : undefined,
        stream_order: props.stream_order ? Number(props.stream_order) : undefined,
        perennial: props.perennial !== undefined ? Boolean(props.perennial) : undefined,
        status: props.status || props.inspection_status || "Active",
        score: props.score ? Number(props.score) : undefined,
        capacity_m3: props.capacity_m3 ? Number(props.capacity_m3) : undefined,
        storage_status: props.storage_status,
        photo_url: props.photo_url,
        watershed_id: props.watershed_id || props.basin_id,
        source: props.source || "JalRakshak GIS Database",
        license: props.license || "GODL-India",
        verified: props.verified !== undefined ? Boolean(props.verified) : true,
        can_launch_satellite_change: Boolean(props.can_launch_satellite_change || props.type === "waterbody"),
        latitude: e.lngLat.lat,
        longitude: e.lngLat.lng,
        center: [e.lngLat.lng, e.lngLat.lat]
      };

      onSelectFeature(detail);
    };

    const handleFeatureHover = (e: any) => {
      const features = map.queryRenderedFeatures(e.point, { layers: interactiveLayerIds });
      if (features.length) {
        map.getCanvas().style.cursor = "pointer";
        const f = features[0];
        const name = f.properties?.name || f.properties?.river_name || f.properties?.structure_name || "Feature";
        const type = f.properties?.structure_type || f.properties?.type || f.properties?.boundary_type || "";

        if (popupRef.current) {
          popupRef.current
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="p-1">
                <p class="font-semibold text-xs text-slate-800">${name}</p>
                <p class="text-[11px] text-slate-500 capitalize">${type.replace(/_/g, " ")}</p>
              </div>`
            )
            .addTo(map);
        }
      } else {
        map.getCanvas().style.cursor = "";
        if (popupRef.current) popupRef.current.remove();
      }
    };

    interactiveLayerIds.forEach((id) => {
      map.off("click", id, handleFeatureClick);
      map.on("click", id, handleFeatureClick);
    });

    map.on("mousemove", handleFeatureHover);
  }, [
    isMapReady,
    administrativeData,
    watershedsData,
    hydrologyData,
    interventionsData,
    onSelectFeature
  ]);

  // 4. Synchronize Layer Visibility & Opacity
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    layers.forEach((layer) => {
      const isVisible = layer.visible;
      const opacity = layer.opacity;

      switch (layer.id) {
        case "admin-national":
          if (map.getLayer("layer-admin-national")) {
            map.setLayoutProperty("layer-admin-national", "visibility", isVisible ? "visible" : "none");
            map.setPaintProperty("layer-admin-national", "line-opacity", opacity);
          }
          break;
        case "admin-states":
          if (map.getLayer("layer-admin-states-fill")) {
            map.setLayoutProperty("layer-admin-states-fill", "visibility", isVisible ? "visible" : "none");
            map.setPaintProperty("layer-admin-states-fill", "fill-opacity", opacity * 0.35);
          }
          if (map.getLayer("layer-admin-states-line")) {
            map.setLayoutProperty("layer-admin-states-line", "visibility", isVisible ? "visible" : "none");
            map.setPaintProperty("layer-admin-states-line", "line-opacity", opacity);
          }
          break;
        case "admin-districts":
          if (map.getLayer("layer-admin-districts-fill")) {
            map.setLayoutProperty("layer-admin-districts-fill", "visibility", isVisible ? "visible" : "none");
            map.setPaintProperty("layer-admin-districts-fill", "fill-opacity", opacity * 0.3);
          }
          if (map.getLayer("layer-admin-districts-line")) {
            map.setLayoutProperty("layer-admin-districts-line", "visibility", isVisible ? "visible" : "none");
            map.setPaintProperty("layer-admin-districts-line", "line-opacity", opacity);
          }
          break;
        case "hydro-watersheds":
          if (map.getLayer("layer-watersheds-fill")) {
            map.setLayoutProperty("layer-watersheds-fill", "visibility", isVisible ? "visible" : "none");
            map.setPaintProperty("layer-watersheds-fill", "fill-opacity", opacity * 0.3);
          }
          if (map.getLayer("layer-watersheds-line")) {
            map.setLayoutProperty("layer-watersheds-line", "visibility", isVisible ? "visible" : "none");
            map.setPaintProperty("layer-watersheds-line", "line-opacity", opacity);
          }
          break;
        case "hydro-rivers":
          if (map.getLayer("layer-rivers")) {
            map.setLayoutProperty("layer-rivers", "visibility", isVisible ? "visible" : "none");
            map.setPaintProperty("layer-rivers", "line-opacity", opacity);
          }
          break;
        case "hydro-drainage":
          if (map.getLayer("layer-drainage")) {
            map.setLayoutProperty("layer-drainage", "visibility", isVisible ? "visible" : "none");
            map.setPaintProperty("layer-drainage", "line-opacity", opacity);
          }
          break;
        case "hydro-waterbodies":
          if (map.getLayer("layer-waterbodies-fill")) {
            map.setLayoutProperty("layer-waterbodies-fill", "visibility", isVisible ? "visible" : "none");
            map.setPaintProperty("layer-waterbodies-fill", "fill-opacity", opacity * 0.7);
          }
          if (map.getLayer("layer-waterbodies-line")) {
            map.setLayoutProperty("layer-waterbodies-line", "visibility", isVisible ? "visible" : "none");
            map.setPaintProperty("layer-waterbodies-line", "line-opacity", opacity);
          }
          break;
        case "interventions-checkdams":
        case "interventions-farmponds":
        case "interventions-percolation":
          // Clustered & unclustered points
          const pointVisible = layers.some(
            (l) =>
              (l.id === "interventions-checkdams" ||
                l.id === "interventions-farmponds" ||
                l.id === "interventions-percolation") &&
              l.visible
          );
          if (map.getLayer("layer-interventions-clusters")) {
            map.setLayoutProperty("layer-interventions-clusters", "visibility", pointVisible ? "visible" : "none");
          }
          if (map.getLayer("layer-interventions-count")) {
            map.setLayoutProperty("layer-interventions-count", "visibility", pointVisible ? "visible" : "none");
          }
          if (map.getLayer("layer-interventions-unclustered")) {
            map.setLayoutProperty("layer-interventions-unclustered", "visibility", pointVisible ? "visible" : "none");
          }
          break;
        case "interventions-traditional":
          if (map.getLayer("layer-interventions-lines")) {
            map.setLayoutProperty("layer-interventions-lines", "visibility", isVisible ? "visible" : "none");
            map.setPaintProperty("layer-interventions-lines", "line-opacity", opacity);
          }
          break;
      }
    });
  }, [layers, isMapReady]);

  // 5. Handle Navigation / Zoom To Target
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !navigationTarget) return;

    if (navigationTarget.bounds) {
      map.fitBounds(navigationTarget.bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 14,
        duration: 1200
      });
    } else {
      map.flyTo({
        center: navigationTarget.center,
        zoom: navigationTarget.zoom,
        essential: true,
        duration: 1200
      });
    }
  }, [navigationTarget]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px] relative overflow-hidden bg-slate-950"
    />
  );
};

export default MapCanvas;
