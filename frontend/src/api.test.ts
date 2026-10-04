import { describe, expect, it } from "vitest";
import { getApiBaseUrl, getReportDownloadUrl, parseApiError } from "./api";

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
});
