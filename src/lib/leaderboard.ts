import type { GrillLeaderboardEntry } from '@/types/game';
import { loadServerLeaderboardEntries } from '@/lib/serverApi';

const LEADERBOARD_STORAGE_KEY = 'monadfish_grill_leaderboard_v1';
const LOCAL_PLAYER_ID_KEY = 'monadfish_leaderboard_player_id_v1';
export const DEFAULT_LEADERBOARD_NAME = 'Guest griller';

const createFallbackId = () => `guest:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;

export const sanitizeLeaderboardName = (name: string) => (
  name.trim().replace(/\s+/g, ' ').slice(0, 24)
);

export const hasCustomLeaderboardName = (name?: string | null) => {
  const clean = sanitizeLeaderboardName(name || '');
  return Boolean(clean && clean !== DEFAULT_LEADERBOARD_NAME);
};

const normalizeEntry = (entry: Partial<GrillLeaderboardEntry> & {
  wallet_address?: string | null;
  updated_at?: string | null;
  walletAddress?: string | null;
}): GrillLeaderboardEntry => ({
  id: String(entry.id || ''),
  name: sanitizeLeaderboardName(entry.name || DEFAULT_LEADERBOARD_NAME) || DEFAULT_LEADERBOARD_NAME,
  score: Math.max(0, Number(entry.score || 0)),
  dishes: Math.max(0, Number(entry.dishes || 0)),
  walletAddress: entry.walletAddress || entry.wallet_address || undefined,
  updatedAt: entry.updatedAt || entry.updated_at || new Date().toISOString(),
});

const sortEntries = (entries: GrillLeaderboardEntry[]) => (
  [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  })
);

export const mergeLeaderboardSnapshots = (...snapshots: GrillLeaderboardEntry[][]) => {
  const merged = new Map<string, GrillLeaderboardEntry>();

  for (const snapshot of snapshots) {
    for (const rawEntry of snapshot) {
      const entry = normalizeEntry(rawEntry);
      if (!entry.id) continue;

      const current = merged.get(entry.id);
      if (!current) {
        merged.set(entry.id, entry);
        continue;
      }

      merged.set(entry.id, {
        id: entry.id,
        name: sanitizeLeaderboardName(current.name || entry.name || 'Guest griller') || 'Guest griller',
        score: Math.max(current.score, entry.score),
        dishes: Math.max(current.dishes, entry.dishes),
        walletAddress: current.walletAddress || entry.walletAddress,
        updatedAt: new Date(
          Math.max(
            new Date(current.updatedAt).getTime(),
            new Date(entry.updatedAt).getTime(),
          ),
        ).toISOString(),
      });
    }
  }

  return sortEntries(Array.from(merged.values()));
};

export const loadLeaderboardEntries = (): GrillLeaderboardEntry[] => {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GrillLeaderboardEntry[];
    if (!Array.isArray(parsed)) return [];

    return mergeLeaderboardSnapshots(parsed.filter((entry) => (
      entry
      && typeof entry.id === 'string'
      && typeof entry.name === 'string'
      && Number.isFinite(Number(entry.score))
    )).map((entry) => normalizeEntry(entry)));
  } catch {
    return [];
  }
};

export const saveLeaderboardEntries = (entries: GrillLeaderboardEntry[]) => {
  localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(mergeLeaderboardSnapshots(entries)));
};

export const getLeaderboardPlayerId = (walletAddress?: string) => {
  if (walletAddress) return `wallet:${walletAddress.toLowerCase()}`;

  try {
    const existing = localStorage.getItem(LOCAL_PLAYER_ID_KEY);
    if (existing) return existing;

    const next = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `guest:${crypto.randomUUID()}`
      : createFallbackId();
    localStorage.setItem(LOCAL_PLAYER_ID_KEY, next);
    return next;
  } catch {
    return createFallbackId();
  }
};

interface MergeLeaderboardEntriesOptions {
  entries: GrillLeaderboardEntry[];
  fromId: string;
  toId: string;
  fallbackName: string;
  walletAddress?: string;
}

export const mergeLeaderboardEntries = ({
  entries,
  fromId,
  toId,
  fallbackName,
  walletAddress,
}: MergeLeaderboardEntriesOptions) => {
  if (!fromId || !toId || fromId === toId) return entries;

  const fromEntry = entries.find((entry) => entry.id === fromId);
  if (!fromEntry) return entries;

  const toEntry = entries.find((entry) => entry.id === toId);
  const canonicalWalletName = sanitizeLeaderboardName(fallbackName);
  const mergedEntry: GrillLeaderboardEntry = {
    id: toId,
    name: walletAddress
      ? (canonicalWalletName || sanitizeLeaderboardName(toEntry?.name || fromEntry.name) || DEFAULT_LEADERBOARD_NAME)
      : (sanitizeLeaderboardName(toEntry?.name || fromEntry.name || fallbackName) || DEFAULT_LEADERBOARD_NAME),
    score: Math.max(toEntry?.score ?? 0, fromEntry.score),
    dishes: Math.max(toEntry?.dishes ?? 0, fromEntry.dishes),
    walletAddress: walletAddress || toEntry?.walletAddress || fromEntry.walletAddress,
    updatedAt: new Date().toISOString(),
  };

  const nextEntries = sortEntries([
    ...entries.filter((entry) => entry.id !== fromId && entry.id !== toId),
    mergedEntry,
  ]);
  saveLeaderboardEntries(nextEntries);
  return nextEntries;
};

interface UpsertLeaderboardEntryOptions {
  entries: GrillLeaderboardEntry[];
  id: string;
  name: string;
  score: number;
  dishesDelta?: number;
  walletAddress?: string;
}

export const upsertLeaderboardEntry = ({
  entries,
  id,
  name,
  score,
  dishesDelta = 0,
  walletAddress,
}: UpsertLeaderboardEntryOptions) => {
  const existing = entries.find((entry) => entry.id === id);
  const entry: GrillLeaderboardEntry = {
    id,
    name: sanitizeLeaderboardName(name),
    score: Math.max(existing?.score ?? 0, score),
    dishes: Math.max(0, (existing?.dishes ?? 0) + dishesDelta),
    walletAddress: walletAddress || existing?.walletAddress,
    updatedAt: new Date().toISOString(),
  };

  const nextEntries = sortEntries([
    ...entries.filter((item) => item.id !== id),
    entry,
  ]);
  saveLeaderboardEntries(nextEntries);
  return nextEntries;
};

const shouldSyncLocalEntry = (localEntry: GrillLeaderboardEntry, remoteEntry?: GrillLeaderboardEntry) => {
  if (!localEntry.id || localEntry.score <= 0 || !hasCustomLeaderboardName(localEntry.name)) {
    return false;
  }

  if (!remoteEntry) return true;
  if (localEntry.score > remoteEntry.score) return true;
  if (localEntry.dishes > remoteEntry.dishes) return true;
  if (hasCustomLeaderboardName(localEntry.name) && !hasCustomLeaderboardName(remoteEntry.name)) return true;

  const localUpdatedAt = new Date(localEntry.updatedAt).getTime();
  const remoteUpdatedAt = new Date(remoteEntry.updatedAt).getTime();

  return localUpdatedAt > remoteUpdatedAt
    && (
      localEntry.name !== remoteEntry.name
      || localEntry.score !== remoteEntry.score
      || localEntry.dishes !== remoteEntry.dishes
    );
};

const syncNamedLocalEntries = async (remoteEntries: GrillLeaderboardEntry[]) => {
  const localEntries = loadLeaderboardEntries().filter((entry) => (
    entry.id
    && entry.score > 0
    && hasCustomLeaderboardName(entry.name)
  ));

  if (localEntries.length === 0) {
    return false;
  }

  const remoteMap = new Map(remoteEntries.map((entry) => [entry.id, entry]));
  const syncTargets = localEntries.filter((entry) => shouldSyncLocalEntry(entry, remoteMap.get(entry.id)));

  if (syncTargets.length === 0) {
    return false;
  }

  const results = await Promise.allSettled(syncTargets.map((entry) => saveGlobalLeaderboardEntry(entry)));
  return results.some((result) => result.status === 'fulfilled' && result.value === true);
};

export const loadGlobalLeaderboardEntries = async () => {
  try {
    let remoteEntries = (await loadServerLeaderboardEntries()).map((entry) => normalizeEntry(entry));

    if (await syncNamedLocalEntries(remoteEntries)) {
      remoteEntries = (await loadServerLeaderboardEntries()).map((entry) => normalizeEntry(entry));
    }

    const canonicalEntries = mergeLeaderboardSnapshots(remoteEntries);
    saveLeaderboardEntries(canonicalEntries);
    return canonicalEntries;
  } catch {
    return null;
  }
};

export const saveGlobalLeaderboardEntry = async (_entry: GrillLeaderboardEntry) => false;

export const deleteGlobalLeaderboardEntry = async (_id: string) => false;
