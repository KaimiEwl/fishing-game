import { publicAsset } from '@/lib/assets';
import { useCallback, useEffect } from 'react';

export const SOUND_MUTED_EVENT = 'monadfish:sound-muted-changed';
export const MUSIC_MUTED_EVENT = 'monadfish:music-muted-changed';
const SOUND_MUTED_STORAGE_KEY = 'sound_muted';
const MUSIC_MUTED_STORAGE_KEY = 'music_muted';

// Один общий AudioContext (лениво создаётся)
let audioContext: AudioContext | null = null;
type LegacyAudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

const CAST_SAMPLE_URLS = [
  publicAsset('/assets/audio/cast_01.mp3'),
  publicAsset('/assets/audio/cast_02.mp3'),
  publicAsset('/assets/audio/cast_03.mp3'),
  publicAsset('/assets/audio/cast_04.mp3'),
  publicAsset('/assets/audio/cast_05.mp3'),
  publicAsset('/assets/audio/cast_06.mp3'),
  publicAsset('/assets/audio/cast_07.mp3'),
];
const FISH_CATCH_SAMPLE_URL = publicAsset('/assets/audio/fish_catch_boat.mp3');
const CUBE_SPIN_SAMPLE_URL = publicAsset('/assets/audio/cube_spin_launch.mp3');
// CC0 source: OpenGameArt "Victory Fanfare", trimmed/time-compressed for cube spins.
const CUBE_SPIN_FANFARE_URL = publicAsset('/assets/audio/cube_spin_fanfare.mp3');
const GRILL_COOK_SAMPLE_URL = publicAsset('/assets/audio/grill_cook.mp3');
const COIN_GAIN_SAMPLE_URL = publicAsset('/assets/audio/coin_gain.mp3');
const sampleBuffers = new Map<string, AudioBuffer>();
const sampleLoads = new Map<string, Promise<AudioBuffer | null>>();
let sampleWarmStarted = false;

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

const decodeAudioData = (ctx: AudioContext, data: ArrayBuffer) =>
  new Promise<AudioBuffer>((resolve, reject) => {
    ctx.decodeAudioData(data.slice(0), resolve, reject);
  });

const ensureSampleLoaded = (url: string) => {
  if (sampleBuffers.has(url)) {
    return Promise.resolve(sampleBuffers.get(url) ?? null);
  }

  const existing = sampleLoads.get(url);
  if (existing) {
    return existing;
  }

  const loadPromise = (async () => {
    try {
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) {
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = await decodeAudioData(getCtx(), arrayBuffer);
      sampleBuffers.set(url, buffer);
      return buffer;
    } catch {
      return null;
    } finally {
      sampleLoads.delete(url);
    }
  })();

  sampleLoads.set(url, loadPromise);
  return loadPromise;
};

const warmSoundSamples = () =>
  Promise.all([
    ...CAST_SAMPLE_URLS,
    FISH_CATCH_SAMPLE_URL,
    CUBE_SPIN_SAMPLE_URL,
    CUBE_SPIN_FANFARE_URL,
    GRILL_COOK_SAMPLE_URL,
    COIN_GAIN_SAMPLE_URL,
  ].map((url) => ensureSampleLoaded(url)));

const requestSampleWarmup = () => {
  if (sampleWarmStarted) return;
  sampleWarmStarted = true;
  void warmSoundSamples();
};

const playSampleBuffer = (url: string, volume: number, playbackRate: number = 1) => {
  if (globalMuted) return false;

  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const buffer = sampleBuffers.get(url);
    if (!buffer) {
      return false;
    }

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);

    source.buffer = buffer;
    source.playbackRate.setValueAtTime(playbackRate, ctx.currentTime);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    return true;
  } catch {
    return false;
  }
};

const pickRandom = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

const readLegacyMutedFallback = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SOUND_MUTED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const readScopedMutedFromStorage = (key: string) => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) {
      return readLegacyMutedFallback();
    }
    return raw === 'true';
  } catch {
    return readLegacyMutedFallback();
  }
};

// Global mute state
let globalMuted = readScopedMutedFromStorage(SOUND_MUTED_STORAGE_KEY);
let globalMusicMuted = readScopedMutedFromStorage(MUSIC_MUTED_STORAGE_KEY);

export function isSoundMuted() {
  return globalMuted;
}

export function isMusicMuted() {
  return globalMusicMuted;
}

export function setSoundMuted(muted: boolean) {
  globalMuted = muted;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SOUND_MUTED_STORAGE_KEY, String(muted));
    } catch {
      // ignore storage errors
    }
    window.dispatchEvent(new CustomEvent<boolean>(SOUND_MUTED_EVENT, { detail: muted }));
  }
}

export function setMusicMuted(muted: boolean) {
  globalMusicMuted = muted;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(MUSIC_MUTED_STORAGE_KEY, String(muted));
    } catch {
      // ignore storage errors
    }
    window.dispatchEvent(new CustomEvent<boolean>(MUSIC_MUTED_EVENT, { detail: muted }));
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
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
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
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
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

const playChord = (
  freqs: readonly number[],
  dur: number,
  type: OscillatorType,
  vol: number,
  delay: number,
) => {
  freqs.forEach((freq, index) => {
    playTone(freq, dur, type, vol * (index === 0 ? 1 : 0.78), undefined, delay + index * 0.012);
  });
};

const playCubeSpinFanfare = () => {
  if (globalMuted) return;

  const drumHits = [0, 0.32, 0.64, 0.96, 1.28, 1.6, 1.92, 2.16];
  drumHits.forEach((delay, index) => {
    playTone(index % 2 === 0 ? 82 : 110, 0.16, 'sine', 0.055, index % 2 === 0 ? 52 : 70, delay);
    playNoise(0.04, 0.008, delay + 0.018);
  });

  [
    { notes: [196, 247, 294, 392], delay: 0, dur: 0.58 },
    { notes: [220, 277, 330, 440], delay: 0.55, dur: 0.58 },
    { notes: [262, 330, 392, 523], delay: 1.1, dur: 0.66 },
    { notes: [294, 370, 440, 587], delay: 1.68, dur: 0.74 },
  ].forEach(({ notes, delay, dur }, chordIndex) => {
    notes.forEach((freq, noteIndex) => {
      playTone(
        freq,
        dur,
        noteIndex === 0 ? 'triangle' : 'sine',
        chordIndex === 3 ? 0.021 : 0.017,
        undefined,
        delay + noteIndex * 0.018
      );
    });
  });

  [
    392, 494, 587, 784,
    440, 554, 659, 880,
    523, 659, 784, 1047,
    587, 740, 880, 1175,
    659, 784, 988, 1319,
  ].forEach((freq, index) => {
    const delay = 0.08 + index * 0.105;
    playTone(freq, 0.14, 'triangle', 0.026, undefined, delay);
    if (index % 3 === 0) {
      playTone(freq * 2, 0.1, 'sine', 0.007, undefined, delay + 0.018);
    }
  });

  playChord([392, 494, 587, 784], 0.4, 'triangle', 0.022, 2.08);
  playChord([523, 659, 784, 1047, 1319], 0.48, 'sine', 0.018, 2.22);
  playNoise(0.32, 0.008, 2.14);
};

export function useSoundEffects() {
  useEffect(() => {
    const warmOnce = () => requestSampleWarmup();

    window.addEventListener('pointerdown', warmOnce, { passive: true });
    window.addEventListener('touchend', warmOnce, { passive: true });
    window.addEventListener('keydown', warmOnce);

    return () => {
      window.removeEventListener('pointerdown', warmOnce);
      window.removeEventListener('touchend', warmOnce);
      window.removeEventListener('keydown', warmOnce);
    };
  }, []);

  const playCastSound = useCallback(() => {
    const clipUrl = pickRandom(CAST_SAMPLE_URLS);
    const playbackRate = 0.96 + Math.random() * 0.1;

    if (playSampleBuffer(clipUrl, 0.24, playbackRate)) {
      return;
    }

    void ensureSampleLoaded(clipUrl);
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
    if (playSampleBuffer(FISH_CATCH_SAMPLE_URL, 0.35)) {
      return;
    }

    void ensureSampleLoaded(FISH_CATCH_SAMPLE_URL);
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
    if (playSampleBuffer(COIN_GAIN_SAMPLE_URL, 0.24, 1.02)) {
      return;
    }

    void ensureSampleLoaded(COIN_GAIN_SAMPLE_URL);
    playTone(1200, 0.08, 'triangle', 0.10);
    playTone(1500, 0.1, 'triangle', 0.12, undefined, 0.06);
    playTone(1800, 0.08, 'sine', 0.08, undefined, 0.12);
  }, []);

  const playSellSound = useCallback(() => {
    if (playSampleBuffer(COIN_GAIN_SAMPLE_URL, 0.24, 0.98)) {
      return;
    }

    void ensureSampleLoaded(COIN_GAIN_SAMPLE_URL);
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

  const playCubeSpinSound = useCallback(() => {
    if (!playSampleBuffer(CUBE_SPIN_SAMPLE_URL, 0.16)) {
      void ensureSampleLoaded(CUBE_SPIN_SAMPLE_URL);
    }

    const spinStartedAt = Date.now();
    if (!playSampleBuffer(CUBE_SPIN_FANFARE_URL, 0.24)) {
      void ensureSampleLoaded(CUBE_SPIN_FANFARE_URL).then((buffer) => {
        if (buffer && Date.now() - spinStartedAt < 900) {
          playSampleBuffer(CUBE_SPIN_FANFARE_URL, 0.24);
        }
      });
    }

    playCubeSpinFanfare();
  }, []);

  const playGrillCookSound = useCallback(() => {
    if (playSampleBuffer(GRILL_COOK_SAMPLE_URL, 0.28)) {
      return;
    }

    void ensureSampleLoaded(GRILL_COOK_SAMPLE_URL);
    playNoise(0.2, 0.05);
    playTone(220, 0.26, 'triangle', 0.06, 140, 0.05);
  }, []);

  const playCubeRevealSound = useCallback(() => {
    playTone(620, 0.12, 'triangle', 0.08);
    playTone(840, 0.16, 'sine', 0.07, undefined, 0.08);
    playTone(1080, 0.18, 'triangle', 0.06, undefined, 0.16);
  }, []);

  const playCubeRewardSound = useCallback(() => {
    playTone(784, 0.12, 'sine', 0.12);
    playTone(988, 0.12, 'sine', 0.1, undefined, 0.1);
    playTone(1319, 0.16, 'triangle', 0.12, undefined, 0.2);
    playTone(1760, 0.24, 'triangle', 0.08, undefined, 0.28);
  }, []);

  return {
    playCastSound,
    playSplashSound,
    playBiteSound,
    playSuccessSound,
    playFailSound,
    playBuySound,
    playSellSound,
    playGrillCookSound,
    playLevelUpSound,
    playCubeSpinSound,
    playCubeRevealSound,
    playCubeRewardSound,
  };
}
