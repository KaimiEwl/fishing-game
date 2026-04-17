import type { GrillLeaderboardEntry } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

const LEADERBOARD_STORAGE_KEY = 'monadfish_grill_leaderboard_v1';
const LOCAL_PLAYER_ID_KEY = 'monadfish_leaderboard_player_id_v1';
const REMOTE_LEADERBOARD_TABLE = 'grill_leaderboard';
const REMOTE_LEADERBOARD_BUCKET = 'avatars';
const REMOTE_LEADERBOARD_PREFIX = 'leaderboards/grill';

const createFallbackId = () => `guest:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;

export const sanitizeLeaderboardName = (name: string) => (
  name.trim().replace(/\s+/g, ' ').slice(0, 24)
);

const normalizeEntry = (entry: Partial<GrillLeaderboardEntry> & {
  wallet_address?: string | null;
  updated_at?: string | null;
  walletAddress?: string | null;
}): GrillLeaderboardEntry => ({
  id: String(entry.id || ''),
  name: sanitizeLeaderboardName(entry.name || 'Guest griller') || 'Guest griller',
  score: Math.max(0, Number(entry.score || 0)),
  dishes: Math.max(0, Number(entry.dishes || 0)),
  walletAddress: entry.walletAddress || entry.wallet_address || undefined,
  updatedAt: entry.updatedAt || entry.updated_at || new Date().toISOString(),
});

const getRemoteStoragePath = (id: string) => `${REMOTE_LEADERBOARD_PREFIX}/${encodeURIComponent(id)}.json`;

const loadStorageLeaderboardEntries = async () => {
  const { data: files, error: listError } = await supabase.storage
    .from(REMOTE_LEADERBOARD_BUCKET)
    .list(REMOTE_LEADERBOARD_PREFIX, {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (listError) {
    throw listError;
  }

  const downloaded = await Promise.all((files || [])
    .filter((file) => file.name.endsWith('.json'))
    .map(async (file) => {
      const { data, error } = await supabase.storage
        .from(REMOTE_LEADERBOARD_BUCKET)
        .download(`${REMOTE_LEADERBOARD_PREFIX}/${file.name}`);

      if (error || !data) return null;

      try {
        return normalizeEntry(JSON.parse(await data.text()) as GrillLeaderboardEntry);
      } catch {
        return null;
      }
    }));

  return downloaded.filter((entry): entry is GrillLeaderboardEntry => Boolean(entry));
};

const saveStorageLeaderboardEntry = async (entry: GrillLeaderboardEntry) => {
  const normalized = normalizeEntry(entry);
  const payload = JSON.stringify(normalized);
  const { error } = await supabase.storage
    .from(REMOTE_LEADERBOARD_BUCKET)
    .upload(getRemoteStoragePath(normalized.id), payload, {
      upsert: true,
      contentType: 'application/json',
      cacheControl: '60',
    });

  if (error) {
    throw error;
  }
};

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
  const mergedEntry: GrillLeaderboardEntry = {
    id: toId,
    name: sanitizeLeaderboardName(toEntry?.name || fromEntry.name || fallbackName),
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

export const loadGlobalLeaderboardEntries = async () => {
  try {
    const { data, error } = await supabase
      .from(REMOTE_LEADERBOARD_TABLE)
      .select('id, name, score, dishes, wallet_address, updated_at')
      .order('score', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const merged = mergeLeaderboardSnapshots(
      loadLeaderboardEntries(),
      ((data || []) as Array<Record<string, unknown>>).map((entry) => normalizeEntry(entry)),
    );
    saveLeaderboardEntries(merged);
    return merged;
  } catch {
    try {
      const merged = mergeLeaderboardSnapshots(
        loadLeaderboardEntries(),
        await loadStorageLeaderboardEntries(),
      );
      saveLeaderboardEntries(merged);
      return merged;
    } catch {
      return null;
    }
  }
};

export const saveGlobalLeaderboardEntry = async (entry: GrillLeaderboardEntry) => {
  const normalized = normalizeEntry(entry);
  const payload: TablesInsert<'grill_leaderboard'> = {
    id: normalized.id,
    name: normalized.name,
    score: normalized.score,
    dishes: normalized.dishes,
    wallet_address: normalized.walletAddress ?? null,
    updated_at: normalized.updatedAt,
  };

  try {
    const { error } = await supabase
      .from(REMOTE_LEADERBOARD_TABLE)
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;
    return true;
  } catch {
    try {
      await saveStorageLeaderboardEntry(normalized);
      return true;
    } catch {
      return false;
    }
  }
};

export const deleteGlobalLeaderboardEntry = async (id: string) => {
  const storagePath = getRemoteStoragePath(id);

  try {
    const { error } = await supabase
      .from(REMOTE_LEADERBOARD_TABLE)
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch {
    const { error } = await supabase.storage
      .from(REMOTE_LEADERBOARD_BUCKET)
      .remove([storagePath]);

    if (error && !String(error.message || '').includes('not found')) {
      return false;
    }
  }

  return true;
};
