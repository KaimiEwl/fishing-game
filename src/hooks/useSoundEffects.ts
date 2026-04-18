import { useCallback } from 'react';

// Один общий AudioContext (лениво создаётся)
let audioContext: AudioContext | null = null;
type LegacyAudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

const getCtx = () => {
  if (!audioContext) {
    const audioWindow = window as LegacyAudioWindow;
    const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error('AudioContext is not available');
    }
    audioContext = new AudioContextCtor();
  }
  return audioContext;
};

const readMutedFromStorage = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('sound_muted') === 'true';
  } catch {
    return false;
  }
};

// Global mute state
let globalMuted = readMutedFromStorage();

export function isSoundMuted() {
  return globalMuted;
}

export function setSoundMuted(muted: boolean) {
  globalMuted = muted;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem('sound_muted', String(muted));
    } catch {
      // ignore storage errors
    }
  }
}

// Мягкий тон с плавным затуханием
function playTone(
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  vol: number = 0.15,
  freqEnd?: number,
  delay: number = 0
) {
  if (globalMuted) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    const t0 = ctx.currentTime + delay;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);

    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  } catch (e) {
    /* тихо */
  }
}

// Шум (для всплесков)
function playNoise(dur: number, vol: number = 0.08, delay: number = 0) {
  if (globalMuted) return;
  try {
    const ctx = getCtx();
    const t0 = ctx.currentTime + delay;
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(t0);
    source.stop(t0 + dur);
  } catch (e) {
    /* тихо */
  }
}

export function useSoundEffects() {
  const playCastSound = useCallback(() => {
    playTone(600, 0.2, 'sine', 0.12, 200);
    playTone(400, 0.15, 'triangle', 0.08, 150, 0.1);
  }, []);

  const playSplashSound = useCallback(() => {
    playNoise(0.3, 0.1);
    playTone(120, 0.2, 'sine', 0.08, 60, 0.05);
    playTone(180, 0.15, 'triangle', 0.05, 90, 0.1);
  }, []);

  const playBiteSound = useCallback(() => {
    playTone(880, 0.12, 'sine', 0.12);
    playTone(1100, 0.12, 'sine', 0.10, undefined, 0.1);
    playTone(880, 0.15, 'triangle', 0.08, undefined, 0.2);
  }, []);

  const playSuccessSound = useCallback(() => {
    playTone(523, 0.15, 'sine', 0.14);
    playTone(659, 0.15, 'sine', 0.14, undefined, 0.12);
    playTone(784, 0.15, 'sine', 0.16, undefined, 0.24);
    playTone(1047, 0.25, 'triangle', 0.12, undefined, 0.36);
    playTone(523, 0.3, 'sine', 0.06, undefined, 0.5);
    playTone(659, 0.3, 'sine', 0.06, undefined, 0.5);
    playTone(784, 0.3, 'sine', 0.06, undefined, 0.5);
  }, []);

  const playFailSound = useCallback(() => {
    playTone(440, 0.25, 'sine', 0.10, 220);
    playTone(350, 0.3, 'sine', 0.08, 175, 0.2);
  }, []);

  const playBuySound = useCallback(() => {
    playTone(1200, 0.08, 'triangle', 0.10);
    playTone(1500, 0.1, 'triangle', 0.12, undefined, 0.06);
    playTone(1800, 0.08, 'sine', 0.08, undefined, 0.12);
  }, []);

  const playSellSound = useCallback(() => {
    playTone(800, 0.06, 'sine', 0.10);
    playTone(1000, 0.06, 'sine', 0.10, undefined, 0.05);
    playTone(1200, 0.08, 'triangle', 0.12, undefined, 0.1);
    playTone(1600, 0.12, 'sine', 0.1, undefined, 0.15);
  }, []);

  const playLevelUpSound = useCallback(() => {
    playTone(523, 0.1, 'sine', 0.12);
    playTone(659, 0.1, 'sine', 0.12, undefined, 0.08);
    playTone(784, 0.1, 'sine', 0.12, undefined, 0.16);
    playTone(1047, 0.15, 'sine', 0.14, undefined, 0.24);
    playTone(1319, 0.15, 'sine', 0.12, undefined, 0.36);
    playTone(1568, 0.25, 'triangle', 0.14, undefined, 0.48);
    playTone(1047, 0.4, 'sine', 0.06, undefined, 0.65);
    playTone(1319, 0.4, 'sine', 0.06, undefined, 0.65);
    playTone(1568, 0.4, 'sine', 0.06, undefined, 0.65);
  }, []);

  return {
    playCastSound,
    playSplashSound,
    playBiteSound,
    playSuccessSound,
    playFailSound,
    playBuySound,
    playSellSound,
    playLevelUpSound,
  };
}
