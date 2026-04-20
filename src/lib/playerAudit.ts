import { supabase } from '@/integrations/supabase/client';
import type { PlayerState } from '@/types/game';
import { getStoredWalletSession } from '@/lib/walletSession';

const readFlag = (value: string | undefined, fallback: boolean) => {
  if (value == null || value.trim() === '') return fallback;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

export const PLAYER_AUDIT_LOGS_ENABLED = readFlag(import.meta.env.VITE_PLAYER_AUDIT_LOGS_ENABLED, true);

export interface PlayerAuditSnapshot {
  coins: number;
  bait: number;
  daily_free_bait: number;
  xp: number;
  total_catches: number;
  rod_level: number;
  equipped_rod: number;
}

export interface PlayerAuditEventInput {
  walletAddress: string;
  eventType: string;
  beforeState: PlayerAuditSnapshot;
  afterState: PlayerAuditSnapshot;
  metadata?: Record<string, unknown>;
}

export interface PlayerAuditEventPayload {
  eventType: string;
  beforeState: PlayerAuditSnapshot;
  afterState: PlayerAuditSnapshot;
  metadata?: Record<string, unknown>;
}

export const toPlayerAuditSnapshot = (
  player: Pick<PlayerState, 'coins' | 'bait' | 'dailyFreeBait' | 'xp' | 'totalCatches' | 'rodLevel' | 'equippedRod'>,
): PlayerAuditSnapshot => ({
  coins: player.coins,
  bait: player.bait,
  daily_free_bait: player.dailyFreeBait,
  xp: player.xp,
  total_catches: player.totalCatches,
  rod_level: player.rodLevel,
  equipped_rod: player.equippedRod,
});

export async function logPlayerAuditEvent({
  walletAddress,
  eventType,
  beforeState,
  afterState,
  metadata = {},
}: PlayerAuditEventInput) {
  if (!PLAYER_AUDIT_LOGS_ENABLED) return;

  const session = getStoredWalletSession();
  if (!session) return;
  if (session.address.toLowerCase() !== walletAddress.toLowerCase()) return;

  try {
    await supabase.functions.invoke('log-player-event', {
      body: {
        wallet_address: walletAddress,
        session_token: session.token,
        event_type: eventType,
        before_state: beforeState,
        after_state: afterState,
        metadata,
      },
    });
  } catch (error) {
    console.error('Player audit log failed:', error);
  }
}
