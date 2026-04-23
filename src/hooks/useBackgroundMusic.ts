import { useEffect } from 'react';
import { publicAsset } from '@/lib/assets';
import { MUSIC_MUTED_EVENT, isMusicMuted } from '@/hooks/useSoundEffects';

const MUSIC_TRACK_URL = publicAsset('/assets/audio/bg_gone_fishin.mp3');
const MUSIC_VOLUME = 0.28;

type MusicState = {
  audio: HTMLAudioElement;
  unlocked: boolean;
};

declare global {
  interface Window {
    __monadFishMusicState?: MusicState;
  }
}

const ensureMusicState = (): MusicState | null => {
  if (typeof window === 'undefined') return null;
  if (window.__monadFishMusicState) return window.__monadFishMusicState;

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
  };

  return window.__monadFishMusicState;
};

const startMusic = async () => {
  const state = ensureMusicState();
  if (!state) return false;
  if (document.visibilityState !== 'visible' || isMusicMuted()) {
    return false;
  }

  state.audio.muted = false;
  state.audio.volume = MUSIC_VOLUME;

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

export function useBackgroundMusic() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const state = ensureMusicState();
    if (!state) return undefined;

    const syncMute = () => {
      const muted = isMusicMuted();
      state.audio.muted = muted;
      state.audio.volume = MUSIC_VOLUME;

      if (muted) {
        state.audio.pause();
        return;
      }

      if (document.visibilityState === 'visible') {
        void startMusic();
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
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
    window.addEventListener('pointerup', handleFirstInteraction, { passive: true });
    window.addEventListener('click', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    window.addEventListener('touchend', handleFirstInteraction, { passive: true });

    return () => {
      window.removeEventListener(MUSIC_MUTED_EVENT, syncMute as EventListener);
      document.removeEventListener('visibilitychange', handleVisibility);
      removeUnlockListeners();
    };
  }, []);
}
