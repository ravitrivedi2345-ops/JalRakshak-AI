/**
 * Offline Sync Manager for Field Officers
 * Handles offline photo caching and field record queueing when operating in low-connectivity areas.
 */

export type OfflineRecord = {
  id: string;
  type: "verification_submission" | "photo_evidence";
  siteId: string;
  observation: string;
  photoName?: string;
  photoDataUrl?: string;
  timestamp: string;
  status: "queued" | "synced" | "failed";
};

const QUEUE_STORAGE_KEY = "jalrakshak_offline_queue";

export function getOfflineQueue(): OfflineRecord[] {
  try {
    const data = localStorage.getItem(QUEUE_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveOfflineRecord(record: Omit<OfflineRecord, "id" | "timestamp" | "status">): OfflineRecord {
  const queue = getOfflineQueue();
  const newRecord: OfflineRecord = {
    ...record,
    id: `off-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    status: "queued"
  };
  queue.push(newRecord);
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  return newRecord;
}

export function clearSyncedRecords(): void {
  const queue = getOfflineQueue().filter((r) => r.status !== "synced");
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

export async function syncOfflineQueue(
  syncHandler: (record: OfflineRecord) => Promise<boolean>
): Promise<{ syncedCount: number; failedCount: number }> {
  const queue = getOfflineQueue();
  let syncedCount = 0;
  let failedCount = 0;

  for (const item of queue) {
    if (item.status === "synced") continue;
    try {
      const success = await syncHandler(item);
      if (success) {
        item.status = "synced";
        syncedCount++;
      } else {
        item.status = "failed";
        failedCount++;
      }
    } catch {
      item.status = "failed";
      failedCount++;
    }
  }

  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  return { syncedCount, failedCount };
}

export function registerServiceWorker(): void {
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Service Worker registration failed:", err);
      });
    });
  }
}
