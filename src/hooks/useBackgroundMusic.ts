import { useEffect } from 'react';
import { publicAsset } from '@/lib/assets';
import { MUSIC_MUTED_EVENT, isMusicMuted } from '@/hooks/useSoundEffects';

const MUSIC_TRACK_URL = publicAsset('/assets/audio/bg_gone_fishin.mp3');
const MUSIC_VOLUME = 0.28;
const MUSIC_DUCK_VOLUME = 0.025;
const DEFAULT_MUSIC_DUCK_MS = 12_000;
const BACKGROUND_MUSIC_DUCK_EVENT = 'monadfish:background-music-duck';
const BACKGROUND_MUSIC_RESTORE_EVENT = 'monadfish:background-music-restore';

type MusicDuckEventDetail = {
  durationMs?: number;
  volume?: number;
};

type MusicState = {
  audio: HTMLAudioElement;
  unlocked: boolean;
  ducked: boolean;
  duckedVolume: number;
  duckTimer?: number;
};

declare global {
  interface Window {
    __monadFishMusicState?: MusicState;
  }
}

const ensureMusicState = (): MusicState | null => {
  if (typeof window === 'undefined') return null;
  if (window.__monadFishMusicState) {
    window.__monadFishMusicState.ducked ??= false;
    window.__monadFishMusicState.duckedVolume ??= MUSIC_DUCK_VOLUME;
    return window.__monadFishMusicState;
  }

  const audio = new Audio(MUSIC_TRACK_URL);
  audio.loop = true;
  audio.preload = 'auto';
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
  audio.volume = MUSIC_VOLUME;
  audio.muted = isMusicMuted();

  window.__monadFishMusicState = {
    audio,
    unlocked: false,
    ducked: false,
    duckedVolume: MUSIC_DUCK_VOLUME,
  };

  return window.__monadFishMusicState;
};

const getMusicVolume = (state: MusicState) => (
  state.ducked ? state.duckedVolume : MUSIC_VOLUME
);

const applyMusicVolume = (state: MusicState) => {
  state.audio.volume = getMusicVolume(state);
};

const normalizeDuckVolume = (volume: unknown) => {
  const parsed = Number(volume);
  if (!Number.isFinite(parsed)) return MUSIC_DUCK_VOLUME;
  return Math.max(0, Math.min(MUSIC_VOLUME, parsed));
};

const startMusic = async () => {
  const state = ensureMusicState();
  if (!state) return false;
  if (document.visibilityState !== 'visible' || isMusicMuted()) {
    return false;
  }

  state.audio.muted = false;
  applyMusicVolume(state);

  if (!state.audio.paused) {
    state.unlocked = true;
    return true;
  }

  try {
    await state.audio.play();
    state.unlocked = true;
    return true;
  } catch {
    return false;
  }
};

export function duckBackgroundMusic(durationMs = DEFAULT_MUSIC_DUCK_MS, volume = MUSIC_DUCK_VOLUME) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<MusicDuckEventDetail>(BACKGROUND_MUSIC_DUCK_EVENT, {
    detail: { durationMs, volume },
  }));
}

export function restoreBackgroundMusic() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BACKGROUND_MUSIC_RESTORE_EVENT));
}

export function useBackgroundMusic() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const state = ensureMusicState();
    if (!state) return undefined;

    const syncMute = () => {
      const muted = isMusicMuted();
      state.audio.muted = muted;
      applyMusicVolume(state);

      if (muted) {
        state.audio.pause();
        return;
      }

      if (document.visibilityState === 'visible') {
        void startMusic();
      }
    };

    const restoreMusicVolume = () => {
      if (state.duckTimer !== undefined) {
        window.clearTimeout(state.duckTimer);
        state.duckTimer = undefined;
      }

      state.ducked = false;
      state.duckedVolume = MUSIC_DUCK_VOLUME;
      applyMusicVolume(state);
    };

    const duckMusic = (event: Event) => {
      const detail = (event as CustomEvent<MusicDuckEventDetail>).detail ?? {};
      const durationMs = Math.max(0, Number(detail.durationMs ?? DEFAULT_MUSIC_DUCK_MS));

      if (state.duckTimer !== undefined) {
        window.clearTimeout(state.duckTimer);
        state.duckTimer = undefined;
      }

      state.ducked = true;
      state.duckedVolume = normalizeDuckVolume(detail.volume);
      applyMusicVolume(state);

      if (durationMs > 0) {
        state.duckTimer = window.setTimeout(restoreMusicVolume, durationMs);
      }
    };

    const removeUnlockListeners = () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('pointerup', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('touchend', handleFirstInteraction);
    };

    const handleFirstInteraction = () => {
      void startMusic().then((started) => {
        if (started) {
          removeUnlockListeners();
        }
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncMute();
        void startMusic();
      } else {
        state.audio.pause();
      }
    };

    syncMute();
    window.addEventListener(MUSIC_MUTED_EVENT, syncMute as EventListener);
    window.addEventListener(BACKGROUND_MUSIC_DUCK_EVENT, duckMusic as EventListener);
    window.addEventListener(BACKGROUND_MUSIC_RESTORE_EVENT, restoreMusicVolume as EventListener);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
    window.addEventListener('pointerup', handleFirstInteraction, { passive: true });
    window.addEventListener('click', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    window.addEventListener('touchend', handleFirstInteraction, { passive: true });

    return () => {
      window.removeEventListener(MUSIC_MUTED_EVENT, syncMute as EventListener);
      window.removeEventListener(BACKGROUND_MUSIC_DUCK_EVENT, duckMusic as EventListener);
      window.removeEventListener(BACKGROUND_MUSIC_RESTORE_EVENT, restoreMusicVolume as EventListener);
      document.removeEventListener('visibilitychange', handleVisibility);
      removeUnlockListeners();
      restoreMusicVolume();
    };
  }, []);
}
