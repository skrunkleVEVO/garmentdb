// localStorage persistence (also the offline copy when cloud sync is on).
// Each item is a flat JSON document with a stable id and updatedAt, mirrored
// 1:1 to Firestore users/{uid}/items/{id} by hooks/useCloudSync.js.
// Item metadata lives in one small JSON array;
// each photo is stored under its own key so status toggles don't rewrite
// megabytes of image data.
// Namespace kept from the original app name so existing wardrobes keep loading.
const NS = 'digital-closet:';
const PHOTO = 'photo:';

export function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Returns false when the write failed (usually the ~5 MB quota). */
export function save(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const photoCache = new Map();

export function getPhoto(id) {
  if (photoCache.has(id)) return photoCache.get(id);
  let value = null;
  try {
    value = localStorage.getItem(NS + PHOTO + id);
  } catch {
    /* storage unavailable */
  }
  photoCache.set(id, value);
  return value;
}

export function putPhoto(id, dataUrl) {
  try {
    localStorage.setItem(NS + PHOTO + id, dataUrl);
    photoCache.set(id, dataUrl);
    return true;
  } catch {
    return false;
  }
}

/** Stores a photo that came from the cloud; keeps it in memory even if localStorage is full. */
export function cachePhoto(id, dataUrl) {
  photoCache.set(id, dataUrl);
  try {
    localStorage.setItem(NS + PHOTO + id, dataUrl);
  } catch {
    /* quota: the in-memory copy still renders, and Firestore's cache keeps the original */
  }
}

export function deletePhoto(id) {
  photoCache.delete(id);
  try {
    localStorage.removeItem(NS + PHOTO + id);
  } catch {
    /* ignore */
  }
}

function ownKeys() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(NS)) keys.push(k);
    }
  } catch {
    /* ignore */
  }
  return keys;
}

/** Approximate bytes used (localStorage stores UTF-16). */
export function storageBytes() {
  return ownKeys().reduce((sum, k) => sum + (k.length + (localStorage.getItem(k) || '').length) * 2, 0);
}

export const STORAGE_BUDGET = 5 * 1024 * 1024;

export function buildBackup({ items, looks, settings }) {
  const photos = {};
  items.forEach((it) => {
    const p = getPhoto(it.id);
    if (p) photos[it.id] = p;
  });
  const { apiKey, ...safeSettings } = settings; // never export the API key
  return { app: 'garmentdb', version: 1, exportedAt: new Date().toISOString(), items, looks, settings: safeSettings, photos };
}

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Validates a backup and writes its photos. Returns the data to put into state. */
export function restoreBackup(data) {
  const knownApp = data?.app === 'garmentdb' || data?.app === 'digital-closet';
  if (!knownApp || !Array.isArray(data.items)) {
    throw new Error('That file is not a GarmentDB backup.');
  }
  let failed = 0;
  Object.entries(data.photos || {}).forEach(([id, dataUrl]) => {
    if (!putPhoto(id, dataUrl)) failed++;
  });
  if (failed) throw new Error(`Storage is full — ${failed} photos could not be restored.`);
  return { items: data.items, looks: Array.isArray(data.looks) ? data.looks : [], settings: data.settings || {} };
}

export function clearAll() {
  ownKeys().forEach((k) => localStorage.removeItem(k));
  photoCache.clear();
}
