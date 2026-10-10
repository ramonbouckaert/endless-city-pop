// Song-wide choices: tempo and swing, and where an intro gets its
// harmony. The ways each section can be played are in variants.ts.

import type { Odds, Range } from '../lib/random';

export const SONG = {
  tempo: [92, 124] as Range, // BPM: city pop's easy end to its brisker one
  swing: [0.06, 0.12] as Range,
};

// How an intro gets its harmony: the chorus's first four bars (with the
// hook as a teaser), planing add9 chords, or an intro template (perhaps
// with a riff of its own, `melodyChance`).
export type IntroHarmony = 'chorus' | 'planing' | 'template';
export const INTRO = {
  harmony: { chorus: 3, planing: 2, template: 6 } as Odds<IntroHarmony>,
  melodyChance: 0.5,
};
