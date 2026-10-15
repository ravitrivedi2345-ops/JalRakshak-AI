import axios, { AxiosError } from "axios";
import { parseAnalysisResponse, parseUploadedEvidence } from "./workflows";

export type OperationMode = "demo" | "connected";

export type UploadedEvidence = {
  id: string;
  filename: string;
  status: "received" | "processing";
  gps?: { latitude: number; longitude: number; source?: string } | null;
  capturedAt?: string | null;
};

export type DetectionResult = {
  category: string;
  confidence: number;
  source?: string;
  bbox?: [number, number, number, number];
};

export type AnalysisResponse = {
  photo_id: string;
  status: "completed" | "uncertain" | "failed";
  detections: DetectionResult[];
  model?: string;
  processed_at?: string;
};

export type BackendVerificationTask = {
  id: string;
  site_id: string;
  officer: string;
  due_date: string;
  status: "assigned" | "in-progress" | "submitted" | "verified" | "rejected";
  observation: string;
  attachments?: string[];
  history?: { status: string; at: string; by?: string }[];
};

export type BackendNotification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type BackendReport = {
  id: string;
  scope?: string;
  period?: string;
  filename: string;
  status: string;
  file_path?: string;
};

export type BackendSiteResult = {
  id: string;
  name: string;
  district: string;
  kind: string;
  status: string;
  score: number;
  reason: string;
  coordinates: [number, number];
  photo: string;
};

export type SearchResponse = {
  query: string;
  sites: BackendSiteResult[];
  watersheds: { id: string; name: string }[];
};

// On Vercel: VITE_API_BASE_URL is injected by the service binding from the backend service.
// Locally: set VITE_API_BASE_URL=http://localhost:8000 in frontend/.env
// Fallback to "" means all /api/... calls go to the same origin (works on Vercel same-domain rewrites)
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30_000,
  headers: { Accept: "application/json" },
});

// Intercept requests to inject JWT Bearer Token if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("jalrakshak_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export type AuthUser = {
  username: string;
  full_name: string;
  role: string;
  role_code: "admin" | "verifier" | "viewer";
  email: string;
  permissions?: string[];
};

export async function loginWithRole(username: string, requestedRole?: string): Promise<{ token: string; user: AuthUser }> {
  try {
    const { data } = await apiClient.post("/api/v1/auth/login", {
      username,
      password: "password",
      requested_role: requestedRole
    });
    const authData = data?.data;
    if (authData?.access_token) {
      localStorage.setItem("jalrakshak_token", authData.access_token);
      localStorage.setItem("jalrakshak_user", JSON.stringify(authData.user));
    }
    return { token: authData.access_token, user: authData.user };
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export function getCurrentStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("jalrakshak_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logoutUser(): void {
  localStorage.removeItem("jalrakshak_token");
  localStorage.removeItem("jalrakshak_user");
}

export async function fetchSatelliteStatus() {
  try {
    const { data } = await apiClient.get("/api/v1/satellite/status");
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchLiveSatelliteWMS(layer: string = "TRUE_COLOR", bbox: string = "71.0,25.0,72.0,26.0") {
  try {
    const { data } = await apiClient.get("/api/v1/satellite/live-wms", { params: { layer, bbox } });
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}


export function parseApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ error?: { message?: string }; detail?: Array<{ msg?: string }> | string }>;
    if (err.response?.data?.error?.message) {
      return err.response.data.error.message;
    }
    if (Array.isArray(err.response?.data?.detail)) {
      return err.response.data.detail.map((d) => d.msg || "Validation error").join("; ");
    }
    if (typeof err.response?.data?.detail === "string") {
      return err.response.data.detail;
    }
    if (err.code === "ECONNABORTED") {
      return "Request timed out. Please check backend status and retry.";
    }
    if (err.message === "Network Error" || !err.response) {
      return `Unable to connect to backend server at ${apiBaseUrl}. Please ensure FastAPI server is running.`;
    }
    return `HTTP ${err.response.status}: ${err.response.statusText || "Server returned an error"}`;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

export async function checkHealth() {
  try {
    const { data } = await apiClient.get("/health");
    return data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function uploadEvidence(
  file: File,
  metadata: { siteId: string; longitude?: number; latitude?: number; notes?: string },
): Promise<UploadedEvidence> {
  try {
    const body = new FormData();
    body.append("image", file);
    body.append("site_id", metadata.siteId || "barmer");
    if (metadata.longitude !== undefined && !isNaN(metadata.longitude)) body.append("longitude", String(metadata.longitude));
    if (metadata.latitude !== undefined && !isNaN(metadata.latitude)) body.append("latitude", String(metadata.latitude));
    if (metadata.notes) body.append("notes", metadata.notes);

    const { data } = await apiClient.post<unknown>("/api/v1/field-photos", body);
    return parseUploadedEvidence(data);
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function uploadImageFile(file: File, watershedId?: string, interventionId?: string) {
  try {
    const body = new FormData();
    body.append("file", file);
    if (watershedId) body.append("watershed_id", watershedId);
    if (interventionId) body.append("intervention_id", interventionId);

    const { data } = await apiClient.post("/api/v1/images/upload", body);
    return data?.data || data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function analyzeEvidence(photoId: string): Promise<AnalysisResponse> {
  try {
    const { data } = await apiClient.post<unknown>("/api/v1/analyses/interventions", { photo_id: photoId });
    return parseAnalysisResponse(data);
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchDashboardSummary() {
  try {
    const { data } = await apiClient.get("/api/v1/dashboard/summary");
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchDashboardTrends() {
  try {
    const { data } = await apiClient.get("/api/v1/dashboard/trends");
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchInterventions() {
  try {
    const { data } = await apiClient.get("/api/v1/interventions");
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchVerificationTasks(): Promise<BackendVerificationTask[]> {
  try {
    const { data } = await apiClient.get("/api/v1/verification/tasks");
    return data?.data || [];
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function createVerificationTask(payload: {
  site_id: string;
  officer: string;
  due_date: string;
  observation?: string;
}): Promise<BackendVerificationTask> {
  try {
    const { data } = await apiClient.post("/api/v1/verification/tasks", payload);
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function assignVerificationTask(taskId: string, officer: string, dueDate?: string) {
  try {
    const { data } = await apiClient.post(`/api/v1/verification/tasks/${taskId}/assign`, { officer, due_date: dueDate });
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function submitVerificationTask(
  taskId: string,
  payload: { status: string; observation: string; attachments?: string[] },
): Promise<BackendVerificationTask> {
  try {
    const { data } = await apiClient.post(`/api/v1/verification/tasks/${taskId}/submit`, payload);
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchNotifications(): Promise<BackendNotification[]> {
  try {
    const { data } = await apiClient.get("/api/v1/notifications");
    return data?.data || [];
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function markNotificationRead(notificationId: string): Promise<BackendNotification> {
  try {
    const { data } = await apiClient.post(`/api/v1/notifications/${notificationId}/read`);
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function markAllNotificationsRead(): Promise<BackendNotification[]> {
  try {
    const { data } = await apiClient.post("/api/v1/notifications/read-all");
    return data?.data || [];
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function generatePDFReport(scope: string = "Watershed overview", period: string = "This season"): Promise<BackendReport> {
  try {
    const { data } = await apiClient.post("/api/v1/reports/generate", { scope, period });
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function listReports(): Promise<BackendReport[]> {
  try {
    const { data } = await apiClient.get("/api/v1/reports");
    return data?.data || [];
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function downloadReportBlob(reportId: string): Promise<Blob> {
  try {
    const response = await apiClient.get(`/api/v1/reports/${reportId}/download`, {
      responseType: "blob",
    });
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export function getReportDownloadUrl(reportId: string): string {
  return `${apiBaseUrl}/api/v1/reports/${reportId}/download`;
}

export async function searchBackend(query: string): Promise<SearchResponse> {
  try {
    const { data } = await apiClient.get("/api/v1/search", { params: { q: query } });
    return data?.data || { query, sites: [], watersheds: [] };
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchMapFeatures(params?: { bbox?: string; state?: string; district?: string; kind?: string; verification_status?: string }) {
  try {
    const { data } = await apiClient.get("/api/v1/map/features", { params });
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchMapLayers() {
  try {
    const { data } = await apiClient.get("/api/v1/map/layers");
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchStates() {
  try {
    const { data } = await apiClient.get("/api/v1/states");
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchDistricts(state?: string) {
  try {
    const { data } = await apiClient.get("/api/v1/districts", { params: { state } });
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchStateBoundaries() {
  try {
    const { data } = await apiClient.get("/api/v1/boundaries/states");
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchDistrictBoundaries() {
  try {
    const { data } = await apiClient.get("/api/v1/boundaries/districts");
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchRivers() {
  try {
    const { data } = await apiClient.get("/api/v1/hydro/rivers");
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchWaterBodies() {
  try {
    const { data } = await apiClient.get("/api/v1/water-bodies");
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchRestorationSites() {
  try {
    const { data } = await apiClient.get("/api/v1/restoration-sites");
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchFieldPhotoFeatures() {
  try {
    const { data } = await apiClient.get("/api/v1/field-photos");
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchWatersheds() {
  try {
    const { data } = await apiClient.get("/api/v1/watersheds");
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchWatershedBoundary(watershedId: string) {
  try {
    const { data } = await apiClient.get(`/api/v1/watersheds/${watershedId}/boundary`);
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchImpactIndex(watershedId: string) {
  try {
    const { data } = await apiClient.get(`/api/v1/impact-index/${watershedId}`);
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchCrossValidationStatus(siteId?: string) {
  try {
    const { data } = await apiClient.get("/api/v1/cross-validation/status", { params: { site_id: siteId } });
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function assessEvidenceScore(siteId: string) {
  try {
    const { data } = await apiClient.post("/api/v1/evidence/assess", null, { params: { site_id: siteId } });
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchWatershedGeoJSON(watershedCode: string) {
  try {
    const { data } = await apiClient.get(`/api/v1/watersheds/${watershedCode}/geojson`);
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function fetchSatelliteEpochs(watershedCode: string) {
  try {
    const { data } = await apiClient.get(`/api/v1/satellite/${watershedCode}/epochs`);
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

export async function triggerSatelliteProcessing(watershedCode: string, epoch: string) {
  try {
    const { data } = await apiClient.post(`/api/v1/satellite/process/${watershedCode}/${epoch}`);
    return data?.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

// ── Waterbody Explorer (Patna, Bihar) API Services ───────────────────────────
import {
  verifiedPatnaWaterbodies,
  fallbackPatnaHistory,
  type WaterbodyItem,
  type WaterbodyHistory,
  type WaterbodySummary
} from "./patnaWaterbodiesData";

export async function fetchWaterbodies(params?: {
  q?: string;
  status?: string;
  priority?: string;
  waterbody_type?: string;
  district?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: WaterbodyItem[]; total: number; page: number; limit: number }> {
  try {
    const { data } = await apiClient.get("/api/v1/waterbodies", { params });
    if (data?.data?.items) {
      return data.data;
    }
  } catch {
    // Graceful offline / demo fallback
  }

  // Fallback to verified Patna waterbody dataset with client-side filtering
  let filtered = [...verifiedPatnaWaterbodies];
  if (params?.q) {
    const query = params.q.toLowerCase().trim();
    filtered = filtered.filter(w => w.name.toLowerCase().includes(query) || w.id.toLowerCase().includes(query));
  }
  if (params?.status && params.status !== "all") {
    filtered = filtered.filter(w => w.inspection_status === params.status);
  }
  if (params?.priority && params.priority !== "all") {
    filtered = filtered.filter(w => w.priority === params.priority);
  }
  if (params?.waterbody_type && params.waterbody_type !== "all") {
    filtered = filtered.filter(w => w.waterbody_type === params.waterbody_type);
  }

  return {
    items: filtered,
    total: filtered.length,
    page: params?.page || 1,
    limit: params?.limit || 50
  };
}

export async function fetchWaterbodiesSummary(district: string = "Patna"): Promise<WaterbodySummary> {
  try {
    const { data } = await apiClient.get("/api/v1/waterbodies/summary", { params: { district } });
    if (data?.data) {
      return data.data;
    }
  } catch {
    // Graceful fallback calculation
  }

  const by_status: Record<string, number> = {
    not_inspected: 0,
    pending: 0,
    verified: 0,
    action_required: 0,
    restoration_in_progress: 0
  };
  const by_priority: Record<string, number> = { high: 0, medium: 0, low: 0 };
  const by_type: Record<string, number> = {};
  let total_area = 0;
  let verified_boundaries = 0;

  for (const wb of verifiedPatnaWaterbodies) {
    by_status[wb.inspection_status] = (by_status[wb.inspection_status] || 0) + 1;
    by_priority[wb.priority] = (by_priority[wb.priority] || 0) + 1;
    by_type[wb.waterbody_type] = (by_type[wb.waterbody_type] || 0) + 1;
    if (wb.area_hectares) total_area += wb.area_hectares;
    if (wb.is_verified_boundary) verified_boundaries++;
  }

  return {
    district: "Patna",
    state: "Bihar",
    total_waterbodies: verifiedPatnaWaterbodies.length,
    by_status,
    by_priority,
    by_type,
    total_area_hectares: Number(total_area.toFixed(2)),
    verified_boundaries_count: verified_boundaries
  };
}

export async function fetchWaterbodyDetail(id: string): Promise<WaterbodyItem> {
  try {
    const { data } = await apiClient.get(`/api/v1/waterbodies/${id}`);
    if (data?.data) {
      return data.data;
    }
  } catch {
    // Fallback
  }
  const found = verifiedPatnaWaterbodies.find(w => w.id === id);
  if (!found) {
    throw new Error(`Waterbody with ID ${id} not found.`);
  }
  return found;
}

export async function fetchWaterbodyHistory(id: string): Promise<WaterbodyHistory> {
  try {
    const { data } = await apiClient.get(`/api/v1/waterbodies/${id}/history`);
    if (data?.data) {
      return data.data;
    }
  } catch {
    // Fallback
  }

  if (fallbackPatnaHistory[id]) {
    return fallbackPatnaHistory[id];
  }

  const wb = verifiedPatnaWaterbodies.find(w => w.id === id);
  return {
    waterbody_id: id,
    waterbody_name: wb?.name || id,
    has_history: false,
    measurement_trend_available: false,
    inspections: [],
    measurements: [],
    restorations: [],
    photos: []
  };
}


