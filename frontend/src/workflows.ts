import type { AnalysisResponse, DetectionResult, UploadedEvidence } from "./api";

export const MAX_FIELD_IMAGE_BYTES = 15 * 1024 * 1024;

export function validateFieldImage(file: Pick<File, "type" | "size">): string | null {
  if (!file.type.startsWith("image/")) return "Choose an image file to add field evidence.";
  if (file.size > MAX_FIELD_IMAGE_BYTES) return "Image is too large. Choose a file under 15 MB.";
  return null;
}

const verificationTransitions: Record<string, readonly string[]> = {
  pending: ["assigned"],
  assigned: ["in-progress"],
  "in-progress": ["submitted"],
  submitted: ["verified", "rejected"],
  verified: [],
  rejected: [],
};

export function canTransitionVerification(from: string, to: string): boolean {
  return verificationTransitions[from]?.includes(to) ?? false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isDetection(value: unknown): value is DetectionResult {
  if (!isRecord(value) || typeof value.category !== "string" || !value.category.trim()) return false;
  if (typeof value.confidence !== "number" || value.confidence < 0 || value.confidence > 100) return false;
  if (value.bbox === undefined) return true;
  return Array.isArray(value.bbox) &&
    value.bbox.length === 4 &&
    value.bbox.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate) && coordinate >= 0 && coordinate <= 1) &&
    value.bbox[2] >= value.bbox[0] &&
    value.bbox[3] >= value.bbox[1];
}

export function parseUploadedEvidence(value: unknown): UploadedEvidence {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.filename !== "string" ||
    (value.status !== "received" && value.status !== "processing")
  ) {
    throw new Error("The upload service returned an invalid response. The image was not confirmed as received.");
  }
  return { id: value.id, filename: value.filename, status: value.status };
}

export function parseAnalysisResponse(value: unknown): AnalysisResponse {
  if (
    !isRecord(value) ||
    typeof value.photo_id !== "string" ||
    (value.status !== "completed" && value.status !== "uncertain" && value.status !== "failed") ||
    !Array.isArray(value.detections) ||
    !value.detections.every(isDetection) ||
    (value.model !== undefined && typeof value.model !== "string") ||
    (value.processed_at !== undefined && typeof value.processed_at !== "string")
  ) {
    throw new Error("The inference service returned an invalid response. No predictions were displayed.");
  }
  return {
    photo_id: value.photo_id,
    status: value.status,
    detections: value.detections,
    ...(value.model === undefined ? {} : { model: value.model }),
    ...(value.processed_at === undefined ? {} : { processed_at: value.processed_at }),
  };
}

export function createReportDisclosure(mode: "demo" | "connected") {
  return mode === "demo"
    ? "DEMO DATA · Demonstration report; values are simulated examples, not verified environmental results."
    : "Connected mode · This browser report contains the dashboard's labelled sample records; no backend report service is configured.";
}
