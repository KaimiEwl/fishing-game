import { getStoredWalletSession } from '@/lib/walletSession';
import { getStoredGuestSession } from '@/lib/guestSession';
import { logTestActivityEvent } from '@/lib/testActivityLog';
import type { GrillLeaderboardEntry } from '@/types/game';

const EDGE_CALL_TRACE_STORAGE_KEY = 'hookloot_edge_call_trace_v1';
const EDGE_CALL_TRACE_LIMIT = 250;

export interface EdgeInvokeOptions {
  body?: unknown;
  headers?: HeadersInit;
  method?: string;
}

interface EdgeFunctionErrorContext {
  clone: () => Response;
}

interface EdgeCallTrace {
  id: string;
  functionName: string;
  action: string | null;
  wallet: string | null;
  method: string;
  startedAt: number;
}

interface EdgeCallTraceEntry extends Omit<EdgeCallTrace, 'startedAt'> {
  at: string;
  durationMs: number;
  ok: boolean;
  status: number | null;
  error: string | null;
}

export interface EdgeFunctionHttpError extends Error {
  context: EdgeFunctionErrorContext;
  status: number;
  responseBody: string;
  responseData: unknown;
}

export interface HooklootInvokeResponse {
  success?: boolean;
  error?: string;
  player?: unknown;
  [key: string]: unknown;
}

declare global {
  interface Window {
    __hookLootEdgeCalls?: EdgeCallTraceEntry[];
    __hookLootEdgeCallStats?: () => Record<string, number>;
    __clearHookLootEdgeCalls?: () => void;
  }
}

const getRecordValue = (value: unknown, key: string) => (
  value && typeof value === 'object' && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined
);

const getInvokeAction = (body: unknown) => {
  const action = getRecordValue(body, 'action');
  return typeof action === 'string' && action.trim() ? action.trim() : null;
};

const getInvokeWallet = (body: unknown) => {
  const wallet = getRecordValue(body, 'wallet_address') ?? getRecordValue(body, 'walletAddress');
  if (typeof wallet !== 'string') return null;

  const normalized = wallet.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) return null;
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`.toLowerCase();
};

const getInvokeIdentity = (body: unknown) => {
  const wallet = getRecordValue(body, 'wallet_address') ?? getRecordValue(body, 'walletAddress');
  if (typeof wallet === 'string' && wallet.trim()) return wallet.trim().toLowerCase();

  const guestId = getRecordValue(body, 'guest_id') ?? getRecordValue(body, 'guestId');
  if (typeof guestId === 'string' && guestId.trim()) return guestId.trim().toLowerCase();

  return null;
};

const getInvokeSessionToken = (body: unknown) => {
  const sessionToken = getRecordValue(body, 'session_token') ?? getRecordValue(body, 'sessionToken');
  return typeof sessionToken === 'string' && sessionToken.trim() ? sessionToken.trim() : null;
};

const bodyWithStoredSession = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  if (
    body instanceof Blob
    || body instanceof FormData
    || body instanceof URLSearchParams
    || body instanceof ReadableStream
    || body instanceof ArrayBuffer
  ) {
    return body;
  }

  const record = body as Record<string, unknown>;
  if (typeof record.session_token === 'string' && record.session_token.trim()) return body;

  const wallet = record.wallet_address ?? record.walletAddress;
  if (typeof wallet !== 'string') return body;

  const normalizedIdentity = wallet.trim().toLowerCase();
  if (normalizedIdentity.startsWith('guest:')) {
    const session = getStoredGuestSession();
    if (!session || session.guestId.toLowerCase() !== normalizedIdentity) return body;

    return {
      ...record,
      session_token: session.token,
    };
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet.trim())) return body;

  const session = getStoredWalletSession();
  if (!session || session.address.toLowerCase() !== wallet.trim().toLowerCase()) return body;

  return {
    ...record,
    session_token: session.token,
  };
};

const readStoredEdgeCalls = (): EdgeCallTraceEntry[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(EDGE_CALL_TRACE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as EdgeCallTraceEntry[] : [];
  } catch {
    return [];
  }
};

const writeStoredEdgeCalls = (calls: EdgeCallTraceEntry[]) => {
  if (typeof window === 'undefined') return;

  try {
    window.__hookLootEdgeCalls = calls;
    window.localStorage.setItem(EDGE_CALL_TRACE_STORAGE_KEY, JSON.stringify(calls));
  } catch {
    window.__hookLootEdgeCalls = calls;
  }
};

const ensureEdgeCallDebugHelpers = () => {
  if (typeof window === 'undefined') return;

  if (!window.__hookLootEdgeCalls) {
    window.__hookLootEdgeCalls = readStoredEdgeCalls();
  }

  if (!window.__hookLootEdgeCallStats) {
    window.__hookLootEdgeCallStats = () => {
      const calls = window.__hookLootEdgeCalls ?? readStoredEdgeCalls();
      return calls.reduce<Record<string, number>>((stats, call) => {
        const key = call.action ? `${call.functionName}.${call.action}` : call.functionName;
        stats[key] = (stats[key] ?? 0) + 1;
        return stats;
      }, {});
    };
  }

  if (!window.__clearHookLootEdgeCalls) {
    window.__clearHookLootEdgeCalls = () => {
      writeStoredEdgeCalls([]);
    };
  }
};

const beginEdgeCallTrace = (
  functionName: string,
  options: EdgeInvokeOptions | undefined,
): EdgeCallTrace => ({
  id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  functionName,
  action: getInvokeAction(options?.body),
  wallet: getInvokeWallet(options?.body),
  method: options?.method ?? 'POST',
  startedAt: Date.now(),
});

const finishEdgeCallTrace = (
  trace: EdgeCallTrace,
  {
    ok,
    status = null,
    error = null,
  }: {
    ok: boolean;
    status?: number | null;
    error?: string | null;
  },
) => {
  if (typeof window === 'undefined') return;

  ensureEdgeCallDebugHelpers();

  const entry: EdgeCallTraceEntry = {
    id: trace.id,
    functionName: trace.functionName,
    action: trace.action,
    wallet: trace.wallet,
    method: trace.method,
    at: new Date(trace.startedAt).toISOString(),
    durationMs: Date.now() - trace.startedAt,
    ok,
    status,
    error,
  };
  const calls = [...readStoredEdgeCalls(), entry].slice(-EDGE_CALL_TRACE_LIMIT);
  writeStoredEdgeCalls(calls);
};

const logEdgeCallActivity = (
  trace: EdgeCallTrace,
  requestBody: unknown,
  {
    ok,
    status = null,
    error = null,
  }: {
    ok: boolean;
    status?: number | null;
    error?: string | null;
  },
) => {
  if (trace.functionName === 'log-player-event') return;

  void logTestActivityEvent({
    eventType: ok ? 'api_call_succeeded' : 'api_call_failed',
    walletAddress: getInvokeIdentity(requestBody),
    sessionToken: getInvokeSessionToken(requestBody),
    metadata: {
      functionName: trace.functionName,
      action: trace.action,
      method: trace.method,
      status,
      durationMs: Date.now() - trace.startedAt,
      error,
    },
  });
};

const buildInvokeBody = (body: unknown): BodyInit | undefined => {
  if (body == null) return undefined;
  if (
    typeof body === 'string'
    || body instanceof Blob
    || body instanceof FormData
    || body instanceof URLSearchParams
    || body instanceof ReadableStream
    || body instanceof ArrayBuffer
  ) {
    return body;
  }

  return JSON.stringify(body);
};

const buildInvokeHeaders = (body: unknown, initialHeaders?: HeadersInit) => {
  const headers = new Headers(initialHeaders ?? {});
  if (!headers.has('Content-Type') && body != null && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
};

const parseResponsePayload = (response: Response, responseBody: string) => {
  if (response.status === 204 || !responseBody) return null;

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(responseBody);
    } catch {
      return responseBody;
    }
  }

  return responseBody;
};

const buildErrorContext = (response: Response, responseBody: string): EdgeFunctionErrorContext => ({
  clone: () => new Response(responseBody, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  }),
});

const postJson = async <T>(url: string, body: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload && typeof payload === 'object' && typeof (payload as { error?: unknown }).error === 'string'
      ? (payload as { error: string }).error
      : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
};

export const invokeEdgeFunctionHttp = async <T>(
  functionName: string,
  options?: EdgeInvokeOptions,
): Promise<T> => {
  const requestBody = bodyWithStoredSession(options?.body);
  const trace = beginEdgeCallTrace(functionName, { ...options, body: requestBody });
  let response: Response;

  try {
    response = await fetch(`/api/edge/${functionName}`, {
      method: options?.method ?? 'POST',
      headers: buildInvokeHeaders(requestBody, options?.headers),
      body: buildInvokeBody(requestBody),
    });
  } catch (error) {
    finishEdgeCallTrace(trace, {
      ok: false,
      error: error instanceof Error ? error.message : 'fetch failed',
    });
    logEdgeCallActivity(trace, requestBody, {
      ok: false,
      error: error instanceof Error ? error.message : 'fetch failed',
    });
    throw error;
  }

  const responseBody = response.status === 204 ? '' : await response.text();
  const responseData = parseResponsePayload(response, responseBody);

  if (!response.ok) {
    finishEdgeCallTrace(trace, {
      ok: false,
      status: response.status,
      error: 'non-2xx',
    });
    logEdgeCallActivity(trace, requestBody, {
      ok: false,
      status: response.status,
      error: 'non-2xx',
    });

    const error = Object.assign(
      new Error('Hook & Loot API returned a non-2xx status code'),
      {
        context: buildErrorContext(response, responseBody),
        status: response.status,
        responseBody,
        responseData,
      },
    ) as EdgeFunctionHttpError;

    throw error;
  }

  finishEdgeCallTrace(trace, { ok: true, status: response.status });
  logEdgeCallActivity(trace, requestBody, { ok: true, status: response.status });
  return responseData as T;
};

export const invokeHooklootEdge = async <T = HooklootInvokeResponse>(
  functionName: string,
  options?: EdgeInvokeOptions,
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    const data = await invokeEdgeFunctionHttp<T>(functionName, options);
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Hook & Loot API returned a non-2xx status code'),
    };
  }
};

export const uploadPlayerAvatar = async ({
  walletAddress,
  file,
}: {
  walletAddress: string;
  file: File;
}) => {
  const session = getStoredWalletSession();
  if (!session || session.address.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error('Wallet session expired. Reconnect in the game first.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read avatar file.'));
    reader.readAsDataURL(file);
  });

  return postJson<{ publicUrl: string }>('/api/player/avatar', {
    wallet_address: walletAddress.toLowerCase(),
    session_token: session.token,
    filename: file.name,
    dataUrl,
  });
};

export const loadServerLeaderboardEntries = async () => {
  const response = await fetch('/api/leaderboard/grill', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Leaderboard request failed with status ${response.status}`);
  const payload = await response.json() as { entries?: Array<Record<string, unknown>> };
  return payload.entries ?? [];
};

export const saveServerLeaderboardEntry = async (entry: GrillLeaderboardEntry) => (
  postJson<{ entry: Record<string, unknown> }>('/api/leaderboard/grill', {
    id: entry.id,
    name: entry.name,
    walletAddress: entry.walletAddress ?? null,
  })
);

export const deleteServerLeaderboardEntry = async (id: string) => {
  const response = await fetch(`/api/leaderboard/grill/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Leaderboard delete failed with status ${response.status}`);
  }
};
