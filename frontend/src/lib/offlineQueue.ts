import { API_BASE } from './apiBase';

const DB_NAME = 'fundo-offline';
const DB_VERSION = 1;
const STORE = 'requests';
const QUEUE_CHANGED_EVENT = 'fundo-offline-queue-changed';

export interface QueuedRequest {
  id?: number;
  path: string;
  method: string;
  body?: string | null;
  created_at: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function emitQueueChanged() {
  window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT));
}

export function onOfflineQueueChanged(handler: () => void) {
  window.addEventListener(QUEUE_CHANGED_EVENT, handler);
  return () => window.removeEventListener(QUEUE_CHANGED_EVENT, handler);
}

export async function enqueueOfflineRequest(request: Omit<QueuedRequest, 'created_at'>) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({ ...request, created_at: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  emitQueueChanged();
}

export async function getOfflineQueue(): Promise<QueuedRequest[]> {
  const db = await openDb();
  const requests = await new Promise<QueuedRequest[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const getAll = tx.objectStore(STORE).getAll();
    getAll.onsuccess = () => resolve(getAll.result as QueuedRequest[]);
    getAll.onerror = () => reject(getAll.error);
  });
  db.close();
  return requests.sort((a, b) => a.created_at - b.created_at);
}

export async function getOfflineQueueCount(): Promise<number> {
  const db = await openDb();
  const count = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const countRequest = tx.objectStore(STORE).count();
    countRequest.onsuccess = () => resolve(countRequest.result);
    countRequest.onerror = () => reject(countRequest.error);
  });
  db.close();
  return count;
}

async function deleteOfflineRequest(id: number) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function flushOfflineQueue(apiBase = API_BASE) {
  if (!navigator.onLine) return { synced: 0, remaining: await getOfflineQueueCount() };

  const queued = await getOfflineQueue();
  let synced = 0;

  for (const item of queued) {
    if (!item.id) continue;
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const response = await fetch(`${apiBase}${item.path}`, {
        method: item.method,
        headers,
        body: item.body || undefined,
      });
      if (!response.ok) break;
      await deleteOfflineRequest(item.id);
      synced += 1;
    } catch {
      break;
    }
  }

  emitQueueChanged();
  return { synced, remaining: await getOfflineQueueCount() };
}

export const offlineQueueEventName = QUEUE_CHANGED_EVENT;
