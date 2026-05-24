import { getStoredGuestSession } from '@/lib/guestSession';
import { getStoredWalletSession } from '@/lib/walletSession';

const TEST_ACTIVITY_TRACE_STORAGE_KEY = 'hookloot_test_activity_trace_v1';
const TEST_ACTIVITY_TRACE_LIMIT = 500;
const MAX_METADATA_JSON_LENGTH = 12_000;
const MAX_STRING_LENGTH = 1_000;

const readFlag = (value: string | undefined, fallback: boolean) => {
  if (value == null || value.trim() === '') return fallback;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

export const TEST_ACTIVITY_LOGS_ENABLED = readFlag(import.meta.env.VITE_TEST_ACTIVITY_LOGS_ENABLED, true);

export interface TestActivityIdentity {
  walletAddress?: string | null;
  sessionToken?: string | null;
}

export interface TestActivityEventInput extends TestActivityIdentity {
  eventType: string;
  metadata?: Record<string, unknown>;
}

interface TestActivityTraceEntry {
  id: string;
  at: string;
  eventType: string;
  walletAddress: string | null;
  persisted: boolean;
  metadata: Record<string, unknown>;
}

declare global {
  interface Window {
    __hookLootTestActivityEvents?: TestActivityTraceEntry[];
    __clearHookLootTestActivityEvents?: () => void;
  }
}

const getStoredIdentity = (): Required<TestActivityIdentity> | null => {
  const walletSession = getStoredWalletSession();
  if (walletSession?.address && walletSession?.token) {
    return {
      walletAddress: walletSession.address,
      sessionToken: walletSession.token,
    };
  }

  const guestSession = getStoredGuestSession();
  if (guestSession?.guestId && guestSession?.token) {
    return {
      walletAddress: guestSession.guestId,
      sessionToken: guestSession.token,
    };
  }

  return null;
};

const normalizeEventType = (value: string) => {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_.:-]+/g, '_');
  return normalized.slice(0, 80) || 'client_event';
};

const truncateString = (value: string) => (
  value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value
);

const sanitizeValue = (value: unknown, depth = 0): unknown => {
  if (value == null) return value;
  if (typeof value === 'string') return truncateString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) return serializeError(value);
  if (depth >= 5) return '[max-depth]';

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 80)
        .map(([key, item]) => {
          const normalizedKey = key.toLowerCase();
          if (
            normalizedKey.includes('token')
            || normalizedKey.includes('signature')
            || normalizedKey.includes('secret')
          ) {
            return [key, '[redacted]'];
          }

          return [key, sanitizeValue(item, depth + 1)];
        }),
    );
  }

  return truncateString(String(value));
};

const sanitizeMetadata = (metadata: Record<string, unknown> = {}) => {
  const sanitized = sanitizeValue(metadata);

  try {
    const serialized = JSON.stringify(sanitized);
    if (serialized.length <= MAX_METADATA_JSON_LENGTH) {
      return sanitized as Record<string, unknown>;
    }

    return {
      truncated: true,
      preview: serialized.slice(0, MAX_METADATA_JSON_LENGTH),
    };
  } catch {
    return {
      value: truncateString(String(metadata)),
    };
  }
};

const getClientContext = () => {
  if (typeof window === 'undefined') return {};

  return {
    path: `${window.location.pathname}${window.location.search}`,
    visibility: typeof document !== 'undefined' ? document.visibilityState : null,
    online: typeof navigator !== 'undefined' ? navigator.onLine : null,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
  };
};

const readTrace = (): TestActivityTraceEntry[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(TEST_ACTIVITY_TRACE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as TestActivityTraceEntry[] : [];
  } catch {
    return [];
  }
};

const writeTrace = (entries: TestActivityTraceEntry[]) => {
  if (typeof window === 'undefined') return;

  try {
    window.__hookLootTestActivityEvents = entries;
    window.localStorage.setItem(TEST_ACTIVITY_TRACE_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    window.__hookLootTestActivityEvents = entries;
  }
};

const appendTrace = (entry: TestActivityTraceEntry) => {
  if (typeof window === 'undefined') return;

  if (!window.__clearHookLootTestActivityEvents) {
    window.__clearHookLootTestActivityEvents = () => writeTrace([]);
  }

  const entries = [...readTrace(), entry].slice(-TEST_ACTIVITY_TRACE_LIMIT);
  writeTrace(entries);
};

export const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ? truncateString(error.stack) : null,
    };
  }

  return {
    message: truncateString(String(error ?? 'Unknown error')),
  };
};

export async function logTestActivityEvent({
  eventType,
  walletAddress,
  sessionToken,
  metadata = {},
}: TestActivityEventInput) {
  if (!TEST_ACTIVITY_LOGS_ENABLED || typeof window === 'undefined') return;

  const normalizedEventType = normalizeEventType(eventType);
  const storedIdentity = getStoredIdentity();
  const identity = {
    walletAddress: walletAddress || storedIdentity?.walletAddress || null,
    sessionToken: sessionToken || storedIdentity?.sessionToken || null,
  };
  const sanitizedMetadata = sanitizeMetadata({
    ...getClientContext(),
    ...metadata,
  });

  appendTrace({
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    at: new Date().toISOString(),
    eventType: normalizedEventType,
    walletAddress: identity.walletAddress,
    persisted: Boolean(identity.walletAddress && identity.sessionToken),
    metadata: sanitizedMetadata,
  });

  if (import.meta.env.DEV) {
    console.info('[hookloot:test-activity]', normalizedEventType, sanitizedMetadata);
  }

  if (!identity.walletAddress || !identity.sessionToken) return;

  try {
    await fetch('/api/edge/log-player-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: identity.walletAddress,
        session_token: identity.sessionToken,
        event_type: normalizedEventType,
        before_state: {},
        after_state: {},
        metadata: sanitizedMetadata,
      }),
      keepalive: true,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Test activity log failed:', error);
    }
  }
}

export function installTestActivityErrorLogging(getMetadata?: () => Record<string, unknown>) {
  if (!TEST_ACTIVITY_LOGS_ENABLED || typeof window === 'undefined') {
    return () => undefined;
  }

  const readMetadata = () => {
    try {
      return getMetadata?.() ?? {};
    } catch {
      return {};
    }
  };

  const handleError = (event: ErrorEvent) => {
    void logTestActivityEvent({
      eventType: 'client_error',
      metadata: {
        ...readMetadata(),
        error: serializeError(event.error ?? event.message),
        source: event.filename || null,
        line: event.lineno || null,
        column: event.colno || null,
      },
    });
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    void logTestActivityEvent({
      eventType: 'unhandled_rejection',
      metadata: {
        ...readMetadata(),
        error: serializeError(event.reason),
      },
    });
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
}
