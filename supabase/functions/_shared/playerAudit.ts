export interface AuditSnapshot {
  coins: number;
  bait: number;
  daily_free_bait: number;
  xp: number;
  total_catches: number;
  rod_level: number;
  equipped_rod: number;
}

interface InsertPlayerAuditLogInput {
  walletAddress: string;
  eventType: string;
  eventSource: 'client' | 'server';
  beforeState: AuditSnapshot;
  afterState: AuditSnapshot;
  metadata?: Record<string, unknown>;
}

const SNAPSHOT_KEYS = [
  'coins',
  'bait',
  'daily_free_bait',
  'xp',
  'total_catches',
  'rod_level',
  'equipped_rod',
] as const;

const emptySnapshot = (): AuditSnapshot => ({
  coins: 0,
  bait: 0,
  daily_free_bait: 0,
  xp: 0,
  total_catches: 0,
  rod_level: 0,
  equipped_rod: 0,
});

const toSafeNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const sanitizeAuditSnapshot = (value: unknown): AuditSnapshot => {
  const snapshot = emptySnapshot();
  if (!value || typeof value !== 'object') {
    return snapshot;
  }

  const source = value as Record<string, unknown>;
  for (const key of SNAPSHOT_KEYS) {
    snapshot[key] = toSafeNumber(source[key]);
  }

  return snapshot;
};

export const computeAuditDelta = (beforeState: AuditSnapshot, afterState: AuditSnapshot) => ({
  coins: afterState.coins - beforeState.coins,
  bait: afterState.bait - beforeState.bait,
  daily_free_bait: afterState.daily_free_bait - beforeState.daily_free_bait,
  xp: afterState.xp - beforeState.xp,
  total_catches: afterState.total_catches - beforeState.total_catches,
  rod_level: afterState.rod_level - beforeState.rod_level,
  equipped_rod: afterState.equipped_rod - beforeState.equipped_rod,
});

export const fetchPlayerAuditSnapshot = async (supabase: SupabaseClient, walletAddress: string) => {
  const { data, error } = await supabase
    .from('players')
    .select('coins, bait, daily_free_bait, xp, total_catches, rod_level, equipped_rod')
    .eq('wallet_address', walletAddress.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return sanitizeAuditSnapshot(data);
};

export const insertPlayerAuditLog = async (
  supabase: SupabaseClient,
  {
    walletAddress,
    eventType,
    eventSource,
    beforeState,
    afterState,
    metadata = {},
  }: InsertPlayerAuditLogInput,
) => {
  const sanitizedBeforeState = sanitizeAuditSnapshot(beforeState);
  const sanitizedAfterState = sanitizeAuditSnapshot(afterState);
  const deltaState = computeAuditDelta(sanitizedBeforeState, sanitizedAfterState);
  const sanitizedMetadata = metadata && typeof metadata === 'object' ? metadata : {};

  const { error } = await supabase
    .from('player_audit_logs')
    .insert({
      wallet_address: walletAddress.toLowerCase(),
      event_type: eventType,
      event_source: eventSource,
      before_state: sanitizedBeforeState,
      after_state: sanitizedAfterState,
      delta_state: deltaState,
      metadata: sanitizedMetadata,
    });

  if (error) throw error;
};
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
