// Strudel's scheduler wired to Web Audio, with the same sound library
// strudel.cc loads (drum machines, General MIDI soundfonts).

import type { Pattern } from '@strudel/core';
import { initAudioOnFirstClick, registerSynthSounds, samples, webaudioRepl, type ReplState } from '@strudel/webaudio';

const DOUGH = 'https://raw.githubusercontent.com/felixroos/dough-samples/main';
const UZU = 'https://raw.githubusercontent.com/tidalcycles/uzu-drumkit/main';

let sounds: Promise<unknown> | undefined;
function loadSounds(): Promise<unknown> {
  sounds ??= Promise.all([
    registerSynthSounds(),
    // Imported lazily: the soundfont module touches `window` on load.
    import('@strudel/soundfonts').then(({ registerSoundfonts }) => registerSoundfonts()),
    samples(`${DOUGH}/tidal-drum-machines.json`),
    samples(`${DOUGH}/Dirt-Samples.json`),
    samples(`${UZU}/strudel.json`),
  ]);
  return sounds;
}

/** A player for patterns: play(pattern, cps) starts or swaps the pattern; stop() stops. */
export interface Player {
  play(pattern: Pattern, cps: number): Promise<void>;
  stop(): void;
}

export function createPlayer({ onUpdate }: { onUpdate?: (state: ReplState) => void } = {}): Player {
  initAudioOnFirstClick();
  // Start loading now; play() waits for it.
  void loadSounds();
  const repl = webaudioRepl({ onUpdateState: (state) => onUpdate?.(state) });
  return {
    async play(pattern, cps) {
      await loadSounds();
      repl.setCps(cps);
      await repl.setPattern(pattern, true);
    },
    stop: () => repl.stop(),
  };
}
