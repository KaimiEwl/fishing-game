export interface StoredWalletSession {
  address: string;
  token: string;
}

export const SESSION_KEY = 'monadfish_session';

export function getStoredWalletSession(): StoredWalletSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredWalletSession;
    if (!parsed?.address || !parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function storeWalletSession(address: string, token: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ address, token }));
}

export function clearStoredWalletSession() {
  localStorage.removeItem(SESSION_KEY);
}
