import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invokeEdgeFunctionHttp } from '@/lib/serverApi';
import {
  getStoredGuestSession,
  storeGuestSession,
} from '@/lib/guestSession';
import {
  mapPlayerRecord,
  type PlayerRecord,
} from '@/hooks/useWalletAuth';
import type {
  GameProgressSnapshot,
  PlayerState,
} from '@/types/game';

type GuestPlayerSyncMode = 'optimistic' | 'server' | 'link' | 'pending-local';

interface GuestSessionPayload {
  guest_id?: string;
  session_token?: string;
  player?: PlayerRecord;
}

const getProgressSnapshot = (playerRecord: PlayerRecord | null): GameProgressSnapshot | null => (
  playerRecord?.game_progress && typeof playerRecord.game_progress === 'object'
    ? playerRecord.game_progress as GameProgressSnapshot
    : null
);

export function useGuestSession(enabled = true) {
  const [guestId, setGuestId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [savedPlayer, setSavedPlayer] = useState<PlayerState | null>(null);
  const [savedGameProgress, setSavedGameProgress] = useState<GameProgressSnapshot | null>(null);
  const [savedPlayerSyncMode, setSavedPlayerSyncMode] = useState<GuestPlayerSyncMode>('server');
  const [isResolving, setIsResolving] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const initializedRef = useRef(false);

  const applyGuestPlayerPayload = useCallback((
    playerRecord: PlayerRecord,
    options?: { mergeMode?: GuestPlayerSyncMode },
  ) => {
    const mappedPlayer = mapPlayerRecord(playerRecord);
    setSavedPlayerSyncMode(options?.mergeMode ?? 'server');
    setSavedPlayer(mappedPlayer);
    setSavedGameProgress(getProgressSnapshot(playerRecord));
    return mappedPlayer;
  }, []);

  const refreshGuestSession = useCallback(async () => {
    if (!enabled || inFlightRef.current) return false;

    inFlightRef.current = true;
    setIsResolving(true);
    setError(null);

    try {
      const stored = getStoredGuestSession();
      const payload = await invokeEdgeFunctionHttp<GuestSessionPayload>('guest-session', {
        body: {
          guest_id: stored?.guestId ?? guestId,
          session_token: stored?.token ?? sessionToken,
        },
      });

      if (!payload.guest_id || !payload.session_token || !payload.player) {
        throw new Error('Guest session response was incomplete.');
      }

      storeGuestSession(payload.guest_id, payload.session_token);
      setGuestId(payload.guest_id);
      setSessionToken(payload.session_token);
      applyGuestPlayerPayload(payload.player, { mergeMode: 'server' });
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start guest session.');
      return false;
    } finally {
      inFlightRef.current = false;
      setIsResolving(false);
    }
  }, [applyGuestPlayerPayload, enabled, guestId, sessionToken]);

  useEffect(() => {
    if (!enabled) {
      initializedRef.current = false;
      setIsResolving(false);
      return;
    }

    if (initializedRef.current) return;
    initializedRef.current = true;
    void refreshGuestSession();
  }, [enabled, refreshGuestSession]);

  const ready = Boolean(enabled && guestId && sessionToken && savedPlayer);

  return useMemo(() => ({
    guestId,
    sessionToken,
    savedPlayer,
    savedGameProgress,
    savedPlayerSyncMode,
    isResolving,
    error,
    ready,
    refreshGuestSession,
    syncServerPlayerRecord: applyGuestPlayerPayload,
  }), [
    applyGuestPlayerPayload,
    error,
    guestId,
    isResolving,
    ready,
    refreshGuestSession,
    savedGameProgress,
    savedPlayer,
    savedPlayerSyncMode,
    sessionToken,
  ]);
}
