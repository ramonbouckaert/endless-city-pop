// Song-wide choices: tempo and swing, how its chords are voiced, and
// where an intro gets its harmony. The ways each section can be played
// are in variants.ts.

import type { Odds, Range } from '../lib/random';
import type { VoicingStyle } from '../theory';

// How a song voices its chords: the keys, clav and stabs (`comp`) close
// or in fourths, the pad, strings and choir (`sustain`) close or spread.
export interface Voicings {
  comp: Extract<VoicingStyle, 'close' | 'quartal'>;
  sustain: Extract<VoicingStyle, 'close' | 'spread'>;
}
export interface VoicingOdds {
  comp: Odds<Voicings['comp']>;
  sustain: Odds<Voicings['sustain']>;
}

// A fermata: its bar played at this share of the song's tempo. The
// finale's holds long, at half the tempo; a moment held mid-song only
// leans back, the song moving on.
export const FERMATA = { ending: 0.5, midSong: 0.9 };

export const SONG = {
  tempo: [92, 124] as Range, // BPM: city pop's easy end to its brisker one
  // How late an eighth's second sixteenth lands, in sixteenths: from a
  // slight lean (0.06, 53:47) to a clear sixteenth shuffle (0.22, 61:39).
  swing: [0.06, 0.22] as Range,
  // A tonality may have its own (TonalityDef.voicings).
  voicings: { comp: { close: 4, quartal: 1 }, sustain: { close: 3, spread: 1 } } as VoicingOdds,
};

// How an intro gets its harmony: the hook's chords, the chorus's first
// four bars (with the hook as a teaser), planing add9 chords, or an
// intro template (perhaps with a riff of its own, `melodyChance`).
export type IntroHarmony = 'hook' | 'planing' | 'template';
export const INTRO = {
  harmony: { hook: 3, planing: 2, template: 6 } as Odds<IntroHarmony>,
  melodyChance: 0.5,
};

// How a sixteen-bar theme (a theme song's chorus) gets its harmony: the
// vamp three times and a four-bar tag (J-Cycle's way), or the chorus's
// changes twice, the second time to its cadence. A long verse's melody is
// in four-bar phrases this often (`longVerse`).
export type ThemeHarmony = 'vamp' | 'changes';
export const THEME = {
  harmony: { vamp: 2, changes: 1 } as Odds<ThemeHarmony>,
  longVerse: 0.5,
};
