import { describe, it, expect } from "vitest";
import { FALLBACK_LAYERS, searchMapFeatures } from "./map/mapApi";

describe("Interactive Watershed Map Explorer - GIS Layer Registry & Search", () => {
  it("should have comprehensive layer configuration with 3 distinct categories", () => {
    expect(FALLBACK_LAYERS.length).toBeGreaterThanOrEqual(10);

    const categories = new Set(FALLBACK_LAYERS.map((l) => l.category));
    expect(categories.has("administrative")).toBe(true);
    expect(categories.has("hydrological")).toBe(true);
    expect(categories.has("interventions")).toBe(true);
  });

  it("should validate all layers have documented sources, geometries and colors", () => {
    FALLBACK_LAYERS.forEach((layer) => {
      expect(layer.id.length).toBeGreaterThan(0);
      expect(layer.name.length).toBeGreaterThan(0);
      expect(["Polygon", "LineString", "Point"]).toContain(layer.geometry_type);
      expect(layer.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(layer.opacity).toBeGreaterThan(0);
      expect(layer.opacity).toBeLessThanOrEqual(1);
      expect(layer.source.length).toBeGreaterThan(0);
    });
  });

  it("should correctly parse and geocode latitude, longitude coordinate queries", async () => {
    const coordsQuery = "25.5941, 85.1376";
    const results = await searchMapFeatures(coordsQuery);

    expect(results.length).toBe(1);
    const result = results[0];
    expect(result.category).toBe("coordinate");
    expect(result.center[0]).toBeCloseTo(85.1376, 4);
    expect(result.center[1]).toBeCloseTo(25.5941, 4);
    expect(result.zoom).toBeGreaterThanOrEqual(13);
  });

  it("should return fallback search results for administrative and watershed queries", async () => {
    const biharResults = await searchMapFeatures("bihar");
    expect(biharResults.length).toBeGreaterThanOrEqual(1);
    const bihar = biharResults.find((r) => r.id === "state-bihar");
    expect(bihar).toBeDefined();
    expect(bihar?.category).toBe("state");

    const patnaResults = await searchMapFeatures("patna");
    expect(patnaResults.length).toBeGreaterThanOrEqual(1);
    const patnaDist = patnaResults.find((r) => r.id === "dist-patna");
    expect(patnaDist).toBeDefined();

    const barmerResults = await searchMapFeatures("barmer");
    expect(barmerResults.length).toBeGreaterThanOrEqual(1);
    expect(barmerResults.some((r) => r.category === "watershed")).toBe(true);
  });
});
