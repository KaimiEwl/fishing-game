import { useEffect } from 'react';
import { SOUND_MUTED_EVENT, isSoundMuted } from '@/hooks/useSoundEffects';

const NOTE_MAP: Record<string, number> = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A3: 220.0,
  C5: 523.25,
};

const LOOP_LENGTH = 4.8;
const CHORDS = [
  [NOTE_MAP.C4, NOTE_MAP.E4, NOTE_MAP.G4],
  [NOTE_MAP.A3, NOTE_MAP.C4, NOTE_MAP.E4],
  [NOTE_MAP.F4, NOTE_MAP.A3, NOTE_MAP.C4],
  [NOTE_MAP.G4 / 2, NOTE_MAP.D4, NOTE_MAP.G4],
];

type MusicState = {
  ctx: AudioContext;
  gain: GainNode;
  startedAt: number;
  nextNoteAt: number;
  intervalId: number | null;
  running: boolean;
};

declare global {
  interface Window {
    __monadFishMusicState?: MusicState;
  }
}

const getAudioContext = () => {
  const AudioContextCtor = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AudioContextCtor ? new AudioContextCtor() : null;
};

const ensureMusicState = (): MusicState | null => {
  if (typeof window === 'undefined') return null;
  if (window.__monadFishMusicState) return window.__monadFishMusicState;

  const ctx = getAudioContext();
  if (!ctx) return null;

  const gain = ctx.createGain();
  gain.gain.value = isSoundMuted() ? 0 : 0.035;
  gain.connect(ctx.destination);

  window.__monadFishMusicState = {
    ctx,
    gain,
    startedAt: 0,
    nextNoteAt: 0,
    intervalId: null,
    running: false,
  };

  return window.__monadFishMusicState;
};

const playTone = (ctx: AudioContext, gainNode: GainNode, frequency: number, startAt: number, duration: number, type: OscillatorType, volume: number) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(gainNode);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
};

const scheduleMusic = (state: MusicState) => {
  const horizon = state.ctx.currentTime + 0.8;

  while (state.nextNoteAt < horizon) {
    const loopPosition = (state.nextNoteAt - state.startedAt) % LOOP_LENGTH;
    const chordIndex = Math.floor(loopPosition / 1.2) % CHORDS.length;
    const beatInChord = loopPosition % 1.2;
    const chord = CHORDS[chordIndex];

    playTone(state.ctx, state.gain, chord[0], state.nextNoteAt, 0.38, 'triangle', 0.18);

    if (beatInChord < 0.001) {
      playTone(state.ctx, state.gain, chord[1], state.nextNoteAt + 0.12, 0.24, 'sine', 0.08);
      playTone(state.ctx, state.gain, chord[2], state.nextNoteAt + 0.3, 0.22, 'sine', 0.07);
    } else {
      const lead = chordIndex % 2 === 0 ? NOTE_MAP.C5 : NOTE_MAP.E4;
      playTone(state.ctx, state.gain, lead, state.nextNoteAt + 0.04, 0.18, 'square', 0.045);
    }

    state.nextNoteAt += 0.6;
  }
};

const startMusic = async () => {
  const state = ensureMusicState();
  if (!state || state.running) return;

  if (state.ctx.state === 'suspended') {
    await state.ctx.resume();
  }

  state.startedAt = state.ctx.currentTime + 0.05;
  state.nextNoteAt = state.startedAt;
  state.running = true;
  scheduleMusic(state);
  state.intervalId = window.setInterval(() => scheduleMusic(state), 220);
};

export function useBackgroundMusic() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const state = ensureMusicState();
    if (!state) return undefined;

    const syncMute = () => {
      state.gain.gain.value = isSoundMuted() ? 0 : 0.035;
    };

    const handleFirstInteraction = () => {
      void startMusic();
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncMute();
        void startMusic();
      }
    };

    syncMute();
    window.addEventListener(SOUND_MUTED_EVENT, syncMute as EventListener);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });

    return () => {
      window.removeEventListener(SOUND_MUTED_EVENT, syncMute as EventListener);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);
}
