export interface StoredGuestSession {
  guestId: string;
  token: string;
}

const GUEST_SESSION_KEY = 'hookloot_guest_session_v1';

export function getStoredGuestSession(): StoredGuestSession | null {
  try {
    const raw = localStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredGuestSession;
    if (!parsed?.guestId || !parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function storeGuestSession(guestId: string, token: string) {
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify({ guestId, token }));
}

export function clearStoredGuestSession() {
  localStorage.removeItem(GUEST_SESSION_KEY);
}
