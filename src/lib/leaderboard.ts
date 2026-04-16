import type { GrillLeaderboardEntry } from '@/types/game';

const LEADERBOARD_STORAGE_KEY = 'monadfish_grill_leaderboard_v1';
const LOCAL_PLAYER_ID_KEY = 'monadfish_leaderboard_player_id_v1';

const createFallbackId = () => `guest:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;

export const sanitizeLeaderboardName = (name: string) => (
  name.trim().replace(/\s+/g, ' ').slice(0, 24)
);

const sortEntries = (entries: GrillLeaderboardEntry[]) => (
  [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  })
);

export const loadLeaderboardEntries = (): GrillLeaderboardEntry[] => {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GrillLeaderboardEntry[];
    if (!Array.isArray(parsed)) return [];

    return sortEntries(parsed.filter((entry) => (
      entry
      && typeof entry.id === 'string'
      && typeof entry.name === 'string'
      && Number.isFinite(Number(entry.score))
    )).map((entry) => ({
      ...entry,
      score: Number(entry.score),
      dishes: Number(entry.dishes || 0),
      updatedAt: entry.updatedAt || new Date().toISOString(),
    })));
  } catch {
    return [];
  }
};

export const saveLeaderboardEntries = (entries: GrillLeaderboardEntry[]) => {
  localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(sortEntries(entries)));
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
