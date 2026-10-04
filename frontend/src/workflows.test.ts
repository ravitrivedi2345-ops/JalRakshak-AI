import { describe, expect, it } from "vitest";
import { nextTourStep, previousTourStep, seededDemoDetections, tourSteps } from "./tour";
import { parseAnalysisResponse, parseUploadedEvidence } from "./workflows";
import { canTransitionVerification, createReportDisclosure, validateFieldImage } from "./workflows";

describe("guided walkthrough", () => {
  it("keeps all ten stages in workflow order and clamps navigation", () => {
    expect(tourSteps.map((step) => step.id)).toEqual([
      "dashboard", "watershed-select", "layer-tree", "search", "photo-marker", "upload", "satellite", "swipe-compare", "evidence-quality", "reports-export",
    ]);
    expect(nextTourStep(0)).toBe(1);
    expect(nextTourStep(9)).toBe(9);
    expect(previousTourStep(9)).toBe(8);
    expect(previousTourStep(0)).toBe(0);
  });

  it("returns deterministic, explicitly demo-labelled detections", () => {
    expect(seededDemoDetections("barmer")).toEqual(seededDemoDetections("barmer"));
    expect(seededDemoDetections("barmer")[0].source).toContain("DEMO DATA");
    expect(seededDemoDetections("barmer")[0].confidence).toBeGreaterThanOrEqual(70);
    expect(seededDemoDetections("barmer")[0].confidence).toBeLessThanOrEqual(94);
  });
});

describe("field evidence and analysis validation", () => {
  it("rejects non-images and oversized uploads", () => {
    expect(validateFieldImage({ type: "text/plain", size: 10 })).toContain("image");
    expect(validateFieldImage({ type: "image/jpeg", size: 15 * 1024 * 1024 + 1 })).toContain("15 MB");
    expect(validateFieldImage({ type: "image/jpeg", size: 1024 })).toBeNull();
  });

  it("validates upload and inference response shapes", () => {
    expect(parseUploadedEvidence({ id: "photo-1", filename: "field.jpg", status: "received" }).id).toBe("photo-1");
    expect(() => parseUploadedEvidence({ id: 8 })).toThrow("invalid response");
    expect(parseAnalysisResponse({
      photo_id: "photo-1",
      status: "completed",
      detections: [{ category: "pond", confidence: 82, bbox: [0.1, 0.1, 0.8, 0.8] }],
    }).detections).toHaveLength(1);
    expect(() => parseAnalysisResponse({
      photo_id: "photo-1", status: "completed", detections: [{ category: "pond", confidence: 120 }],
    })).toThrow("invalid response");
    expect(() => parseAnalysisResponse({
      photo_id: "photo-1", status: "completed", detections: [{ category: "pond", confidence: 82, bbox: [0, 0, 10, 10] }],
    })).toThrow("invalid response");
  });
});

describe("verification lifecycle and report disclosure", () => {
  it("allows only the declared verification status transitions", () => {
    expect(canTransitionVerification("pending", "assigned")).toBe(true);
    expect(canTransitionVerification("assigned", "submitted")).toBe(false);
    expect(canTransitionVerification("submitted", "verified")).toBe(true);
    expect(canTransitionVerification("verified", "rejected")).toBe(false);
  });

  it("labels demo and connected browser reports honestly", () => {
    expect(createReportDisclosure("demo")).toContain("DEMO DATA");
    expect(createReportDisclosure("connected")).toContain("sample records");
  });
});
