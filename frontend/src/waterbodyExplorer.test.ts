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

describe("Watershed Study Area Selector - Section 11 Verification", () => {
  it("should provide all seven predefined study areas with valid IDs and statuses", async () => {
    const { FALLBACK_STUDY_AREAS } = await import("./map/mapApi");
    expect(FALLBACK_STUDY_AREAS.length).toBe(7);

    const expectedIds = [
      "patna-bihar",
      "kolar-sub-basin",
      "raichur-tungabhadra-catchment",
      "anantapur-arid-watershed",
      "bundelkhand-recharge-zone",
      "vidarbha-basin",
      "thar-canal-command-area",
    ];

    expectedIds.forEach((id) => {
      const area = FALLBACK_STUDY_AREAS.find((a) => a.id === id);
      expect(area).toBeDefined();
      expect(area?.name.length).toBeGreaterThan(3);
      expect(area?.region.length).toBeGreaterThan(2);
      expect(["verified", "sample_curated", "pending_verification"]).toContain(area?.boundary_status);
      expect(["imported", "not_imported"]).toContain(area?.waterbody_dataset_status);
    });
  });

  it("should match search aliases for all six new study areas", async () => {
    const { FALLBACK_STUDY_AREAS } = await import("./map/mapApi");

    const aliasChecks = [
      { query: "Kolar", expectedId: "kolar-sub-basin" },
      { query: "Tungabhadra", expectedId: "raichur-tungabhadra-catchment" },
      { query: "Ananthapuramu", expectedId: "anantapur-arid-watershed" },
      { query: "Bundelkhand", expectedId: "bundelkhand-recharge-zone" },
      { query: "Vidarbha", expectedId: "vidarbha-basin" },
      { query: "Rajasthan Canal", expectedId: "thar-canal-command-area" },
      { query: "Lower Ganga", expectedId: "patna-bihar" },
    ];

    aliasChecks.forEach(({ query, expectedId }) => {
      const q = query.toLowerCase();
      const match = FALLBACK_STUDY_AREAS.find(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.region.toLowerCase().includes(q) ||
          a.aliases.some((al) => al.toLowerCase().includes(q))
      );
      expect(match).toBeDefined();
      expect(match?.id).toBe(expectedId);
    });
  });

  it("should maintain valid GeoJSON polygon boundaries and India bounding envelopes", async () => {
    const { FALLBACK_STUDY_AREAS } = await import("./map/mapApi");

    FALLBACK_STUDY_AREAS.forEach((area) => {
      if (area.geometry) {
        expect(area.geometry.type).toBe("Polygon");
        expect(Array.isArray(area.geometry.coordinates)).toBe(true);
        const ring = area.geometry.coordinates[0];
        expect(ring.length).toBeGreaterThanOrEqual(4);

        // Check closed ring
        expect(ring[0][0]).toBeCloseTo(ring[ring.length - 1][0]);
        expect(ring[0][1]).toBeCloseTo(ring[ring.length - 1][1]);

        // Check WGS84 envelope for India
        ring.forEach(([lon, lat]) => {
          expect(lon).toBeGreaterThanOrEqual(68.0);
          expect(lon).toBeLessThanOrEqual(98.0);
          expect(lat).toBeGreaterThanOrEqual(8.0);
          expect(lat).toBeLessThanOrEqual(38.0);
        });
      }
    });
  });

  it("should return isolated empty datasets for non-Patna study areas without mixing Patna sites", async () => {
    const { fetchStudyAreaWaterbodies, fetchStudyAreaSummary } = await import("./map/mapApi");

    // Thar Canal Command Area has no imported records yet
    const tharWb = await fetchStudyAreaWaterbodies("thar-canal-command-area");
    expect(tharWb.total).toBe(0);
    expect(tharWb.items.length).toBe(0);
    expect(tharWb.waterbody_dataset_status).toBe("not_imported");

    // Vidarbha Basin has 0 records in summary
    const vidarbhaSummary = await fetchStudyAreaSummary("vidarbha-basin");
    expect(vidarbhaSummary.total_waterbodies).toBe(0);
    expect(vidarbhaSummary.waterbody_dataset_status).toBe("not_imported");
    expect(vidarbhaSummary.message).toContain("No verified waterbody records are available for this study area yet.");
  });

  it("should preserve geographic disambiguation notes where boundaries are pending verification", async () => {
    const { FALLBACK_STUDY_AREAS } = await import("./map/mapApi");
    const kolar = FALLBACK_STUDY_AREAS.find((a) => a.id === "kolar-sub-basin");

    expect(kolar).toBeDefined();
    expect(kolar?.boundary_status).toBe("pending_verification");
    expect(kolar?.disambiguation_notes).toContain("Karnataka");
    expect(kolar?.disambiguation_notes).toContain("Narmada");
  });
});

