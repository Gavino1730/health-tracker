import { openDB } from 'idb';

const DB_NAME = 'health-tracker-photos';
const DB_VERSION = 1;
const PHOTO_STORE = 'photos';

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PHOTO_STORE)) {
          db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function savePhoto(id, base64Data, meta = {}) {
  const db = await getDB();
  await db.put(PHOTO_STORE, { id, data: base64Data, createdAt: new Date().toISOString(), ...meta });
  return id;
}

export async function getPhoto(id) {
  const db = await getDB();
  return db.get(PHOTO_STORE, id);
}

export async function deletePhoto(id) {
  const db = await getDB();
  return db.delete(PHOTO_STORE, id);
}

export async function getAllPhotos() {
  const db = await getDB();
  return db.getAll(PHOTO_STORE);
}

// ─── localStorage helpers ────────────────────────────────────────────────────

const LS_KEY = 'healthTrackerState';

export function loadState() {
  try {
    const serialized = localStorage.getItem(LS_KEY);
    return serialized ? JSON.parse(serialized) : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // storage quota exceeded – silently fail
  }
}
