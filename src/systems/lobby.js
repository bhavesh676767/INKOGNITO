const STORAGE_KEY = 'inkognito-lobby-state-v1';

export function loadLobbyState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLobbyState(partial) {
  if (typeof window === 'undefined') return;
  try {
    const current = loadLobbyState() || {};
    const next = { ...current, ...partial };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function generateLobbyId() {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `L-${now}-${rand}`;
}

const ROOM_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode(length = 6) {
  let out = '';
  const max = ROOM_CHARS.length;
  for (let i = 0; i < length; i += 1) {
    out += ROOM_CHARS[Math.floor(Math.random() * max)];
  }
  return out;
}

