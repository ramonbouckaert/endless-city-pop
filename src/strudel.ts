// Strudel's scheduler wired to Web Audio, with the same sound library
// strudel.cc loads (drum machines, General MIDI soundfonts).

import type { Pattern } from '@strudel/core';
import {
  initAudioOnFirstClick,
  registerSynthSounds,
  samples,
  soundMap,
  webaudioRepl,
  type ReplState,
} from '@strudel/webaudio';

const DOUGH = 'https://raw.githubusercontent.com/felixroos/dough-samples/main';
const UZU = 'https://raw.githubusercontent.com/tidalcycles/uzu-drumkit/main';

function loadSounds(): Promise<unknown> {
  return Promise.all([
    registerSynthSounds(),
    // Imported lazily: the soundfont module touches `window` on load.
    import('@strudel/soundfonts').then(({ registerSoundfonts }) => registerSoundfonts()),
    samples(`${DOUGH}/tidal-drum-machines.json`),
    samples(`${DOUGH}/Dirt-Samples.json`),
    samples(`${UZU}/strudel.json`),
  ]);
}

// iPhones mute Web Audio with the ring/silent switch, as they would a
// game's sound effects; music played by an <audio> element plays on. So
// the page asks for media playback: through Safari's Audio Session API
// (iOS 16.4 on), or on older iPhones and iPads by keeping a silent
// <audio> loop going while a song plays. Called from Play's tap, as iOS
// only starts audio in answer to one. `silence` is the loop, on older
// iPhones and iPads (silentLoop).
function playThroughSilentMode(silence: HTMLAudioElement | undefined): void {
  const session = audioSession();
  if (session) session.type = 'playback';
  else if (silence?.paused) void silence.play().catch(() => {});
}

const audioSession = () => (navigator as Navigator & { audioSession?: { type: string } }).audioSession;

// The silent loop, on iPhones and iPads without the Audio Session API.
function silentLoop(): HTMLAudioElement | undefined {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (audioSession() || !ios) return undefined;
  return Object.assign(new Audio(silentWav()), { loop: true });
}

// A tenth of a second of silence, as a WAV file: 8 kHz, 8-bit, mono.
function silentWav(): string {
  const samples = 800;
  const wav = new DataView(new ArrayBuffer(44 + samples));
  const text = (at: number, s: string) => [...s].forEach((c, i) => wav.setUint8(at + i, c.codePointAt(0) ?? 0));
  text(0, 'RIFF');
  wav.setUint32(4, 36 + samples, true);
  text(8, 'WAVEfmt ');
  wav.setUint32(16, 16, true); // format chunk size
  wav.setUint16(20, 1, true); // PCM
  wav.setUint16(22, 1, true); // mono
  wav.setUint32(24, 8000, true); // sample rate
  wav.setUint32(28, 8000, true); // bytes a second
  wav.setUint16(32, 1, true); // bytes a sample
  wav.setUint16(34, 8, true); // bits a sample
  text(36, 'data');
  wav.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) wav.setUint8(44 + i, 128); // 8-bit silence is the midpoint
  return URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
}

/** A sound Strudel can play, by name: a synth, a General MIDI soundfont or a sample. */
export interface SoundInfo {
  name: string;
  type: string;
}

/**
 * A player for patterns: play(pattern, cps) starts or swaps the pattern;
 * stop() stops; now() is how many cycles it has played, or undefined
 * when stopped; sounds() lists every sound once they have loaded.
 */
export interface Player {
  play(pattern: Pattern, cps: number): Promise<void>;
  stop(): void;
  now(): number | undefined;
  sounds(): Promise<SoundInfo[]>;
}

export function createPlayer({ onUpdate }: { onUpdate?: (state: ReplState) => void } = {}): Player {
  initAudioOnFirstClick();
  // Start loading now; play() waits for it.
  const loaded = loadSounds();
  const silence = silentLoop();
  const repl = webaudioRepl({ onUpdateState: (state) => onUpdate?.(state) });
  return {
    async play(pattern, cps) {
      playThroughSilentMode(silence); // before any await: still in the tap
      await loaded;
      repl.setCps(cps);
      await repl.setPattern(pattern, true);
    },
    stop() {
      repl.stop();
      silence?.pause();
    },
    now: () => (repl.scheduler.started ? repl.scheduler.now() : undefined),
    async sounds() {
      await loaded;
      return Object.entries(soundMap.get()).map(([name, { data }]) => ({ name, type: data?.type ?? 'other' }));
    },
  };
}
