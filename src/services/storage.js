// In production, API is same-origin. In dev, CRA proxy forwards /api → localhost:3001.
const API = '';

// ─── App State ────────────────────────────────────────────────────────────────

// Debounce handle — avoid hammering the DB on rapid dispatches
let saveTimer = null;
let lastSerializedState = null;

export async function loadState() {
  try {
    const res = await fetch(`${API}/api/state`);
    if (!res.ok) throw new Error('Server error');
    const data = await res.json();
    if (data && Object.keys(data).length > 0) {
      try { lastSerializedState = JSON.stringify(data); } catch {}
      // Update local cache with fresh server data
      try { localStorage.setItem('healthTrackerState', JSON.stringify(data)); } catch {}
      return data;
    }
    return null;
  } catch {
    // Server unreachable — fall back to local cache so the app still works offline
    try {
      const s = localStorage.getItem('healthTrackerState');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }
}

export function saveState(state) {
  let serialized;
  try {
    serialized = JSON.stringify(state);
  } catch {
    return;
  }

  if (serialized === lastSerializedState) {
    return;
  }

  lastSerializedState = serialized;

  // Write to localStorage immediately for offline resilience
  try { localStorage.setItem('healthTrackerState', serialized); } catch {}

  // Debounce server sync: wait 1.5s after last dispatch before writing to DB
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch(`${API}/api/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: serialized,
    }).catch(() => {}); // silently ignore — localStorage cache will reconcile on next load
  }, 1500);
}

// ─── Photos ───────────────────────────────────────────────────────────────────

export async function savePhoto(id, base64Data, meta = {}) {
  await fetch(`${API}/api/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, data: base64Data, meta }),
  });
  return id;
}

export async function getPhoto(id) {
  try {
    const res = await fetch(`${API}/api/photos/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function deletePhoto(id) {
  await fetch(`${API}/api/photos/${id}`, { method: 'DELETE' }).catch(() => {});
}

export async function getAllPhotos() {
  try {
    const res = await fetch(`${API}/api/photos`);
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}
