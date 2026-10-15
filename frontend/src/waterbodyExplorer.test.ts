import { describe, it, expect } from "vitest";
import {
  verifiedPatnaWaterbodies,
  fallbackPatnaHistory,
  type WaterbodyItem,
} from "./patnaWaterbodiesData";
import {
  fetchWaterbodies,
  fetchWaterbodiesSummary,
  fetchWaterbodyDetail,
  fetchWaterbodyHistory,
} from "./api";

describe("Patna Waterbody Explorer - Ground Truth Dataset", () => {
  it("should contain exactly 15 verified waterbodies for Patna, Bihar", () => {
    expect(verifiedPatnaWaterbodies.length).toBe(15);
    verifiedPatnaWaterbodies.forEach((wb) => {
      expect(wb.district).toBe("Patna");
      expect(wb.state).toBe("Bihar");
      expect(wb.id).toMatch(/^wb-patna-\d{3}$/);
      expect(wb.name.length).toBeGreaterThan(3);
    });
  });

  it("should have all coordinates strictly within Patna geographic bounds", () => {
    // Patna bounding box approx: Lat 25.45 to 25.75, Lon 85.00 to 85.35
    verifiedPatnaWaterbodies.forEach((wb) => {
      expect(wb.latitude).toBeGreaterThanOrEqual(25.45);
      expect(wb.latitude).toBeLessThanOrEqual(25.75);
      expect(wb.longitude).toBeGreaterThanOrEqual(85.00);
      expect(wb.longitude).toBeLessThanOrEqual(85.35);
    });
  });

  it("should support both polygon boundaries and marker fallback for unverified boundaries", () => {
    const withPolygon = verifiedPatnaWaterbodies.filter((wb) => wb.has_polygon && wb.boundary !== null);
    const pointOnly = verifiedPatnaWaterbodies.filter((wb) => !wb.has_polygon || wb.boundary === null);

    expect(withPolygon.length).toBeGreaterThanOrEqual(10);
    expect(pointOnly.length).toBeGreaterThanOrEqual(1); // e.g. Agam Kuan

    const agamKuan = verifiedPatnaWaterbodies.find((wb) => wb.id === "wb-patna-015");
    expect(agamKuan).toBeDefined();
    expect(agamKuan?.has_polygon).toBe(false);
    expect(agamKuan?.boundary).toBeNull();
  });

  it("should correctly calculate summary counts and totals", async () => {
    const summary = await fetchWaterbodiesSummary("Patna");
    expect(summary.total_waterbodies).toBe(15);
    expect(summary.district).toBe("Patna");

    const totalFromStatus = Object.values(summary.by_status).reduce((a, b) => a + b, 0);
    expect(totalFromStatus).toBe(15);

    const totalFromPriority = Object.values(summary.by_priority).reduce((a, b) => a + b, 0);
    expect(totalFromPriority).toBe(15);

    expect(summary.total_area_hectares).toBeGreaterThan(30);
  });

  it("should filter waterbodies by search query", async () => {
    const res = await fetchWaterbodies({ q: "Mangal" });
    expect(res.items.length).toBe(1);
    expect(res.items[0].name).toBe("Mangal Talab");

    const resId = await fetchWaterbodies({ q: "wb-patna-002" });
    expect(resId.items.length).toBe(1);
    expect(resId.items[0].id).toBe("wb-patna-002");
  });

  it("should filter waterbodies by status and priority", async () => {
    const actionRequired = await fetchWaterbodies({ status: "action_required" });
    actionRequired.items.forEach((wb) => {
      expect(wb.inspection_status).toBe("action_required");
    });
    expect(actionRequired.items.length).toBeGreaterThan(0);

    const highPriority = await fetchWaterbodies({ priority: "high" });
    highPriority.items.forEach((wb) => {
      expect(wb.priority).toBe("high");
    });
    expect(highPriority.items.length).toBeGreaterThan(0);
  });

  it("should honestly handle missing historical records without fabricating data", async () => {
    // Waterbody 013 has not been inspected
    const uninspected = await fetchWaterbodyHistory("wb-patna-013");
    expect(uninspected.has_history).toBe(false);
    expect(uninspected.measurement_trend_available).toBe(false);
    expect(uninspected.inspections.length).toBe(0);
    expect(uninspected.measurements.length).toBe(0);

    // Waterbody 001 has full multi-epoch history
    const inspected = await fetchWaterbodyHistory("wb-patna-001");
    expect(inspected.has_history).toBe(true);
    expect(inspected.measurement_trend_available).toBe(true);
    expect(inspected.measurements.length).toBeGreaterThanOrEqual(2);
    expect(inspected.inspections.length).toBeGreaterThan(0);
  });
});
