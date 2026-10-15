import { describe, expect, it } from "vitest";
import {
  getApiBaseUrl,
  getReportDownloadUrl,
  parseApiError,
  getSatelliteChangePdfUrl,
  getSatelliteChangeCsvUrl,
  fetchSatelliteAvailability
} from "./api";

describe("API Client Utilities", () => {
  it("provides correct base URL and report download URL", () => {
    const baseUrl = getApiBaseUrl();
    expect(baseUrl).toBe("http://localhost:8000");

    const downloadUrl = getReportDownloadUrl("report-123");
    expect(downloadUrl).toBe("http://localhost:8000/api/v1/reports/report-123/download");
  });

  it("parses error messages safely", () => {
    expect(parseApiError(new Error("Network connection failed"))).toBe("Network connection failed");
    expect(parseApiError("Unknown string error")).toBe("An unexpected error occurred.");
  });

  it("constructs satellite change PDF and CSV export URLs correctly", () => {
    const pdfUrl = getSatelliteChangePdfUrl("wb-patna-001", "run-abc-123");
    expect(pdfUrl).toContain("/api/v1/waterbodies/wb-patna-001/change-detection/run-abc-123/export-pdf");

    const csvUrl = getSatelliteChangeCsvUrl("wb-patna-001", "run-abc-123");
    expect(csvUrl).toContain("/api/v1/waterbodies/wb-patna-001/change-detection/run-abc-123/export-csv");
  });

  it("fetches satellite availability with Sentinel-2 10m tile metadata", async () => {
    const data = await fetchSatelliteAvailability("wb-patna-001");
    expect(data.waterbody_id).toBe("wb-patna-001");
    expect(data.tile).toBe("T45RTT");
    expect(data.revisit_interval_days).toBe(5);
    expect(data.scenes.length).toBeGreaterThan(0);
    expect(data.recommended_pair.earlier_date).toBeDefined();
    expect(data.recommended_pair.later_date).toBeDefined();
  });
});

