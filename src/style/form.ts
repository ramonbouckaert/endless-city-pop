// Song form: which sections a song may have, how long, and how often.
// Every song has an intro, a verse, a chorus and a final chord; the rest
// is optional, so songs range from a short verse-chorus-solo tune to a
// long one with several rounds, two soloists, a bridge, a breakdown and
// a key change.

import type { Weighted } from '../lib/random';

export type SectionType =
  | 'intro'
  | 'vamp'
  | 'verse'
  | 'pre'
  | 'chorus'
  | 'riff'
  | 'bridge'
  | 'solo'
  | 'breakdown'
  | 'drumBreak'
  | 'lift'
  | 'outro'
  | 'finale';

export const FORM = {
  preBars: [0, 2, 4, 4, 6, 8], // 0: no pre-chorus
  chorusTag: 0.45,
  rounds: [
    [1, 2],
    [2, 5],
    [3, 2],
  ] as Weighted<number>,
  riffChance: [0, 0.4, 0.7],
  introBars: [4, 4, 8],
  vamp: {
    chance: 0.6,
    bars: [4, 8],
    returns: 0.45,
    // Sections that hand over to anything, so the vamp may come back after them.
    after: ['chorus', 'riff', 'bridge', 'solo', 'breakdown'] as readonly SectionType[],
  },
  verseBars: [8, 8, 16],
  bridgeChance: 0.65,
  soloists: [0, 1, 2, 3],
  soloCount: [
    [0, 1],
    [1, 4],
    [2, 3],
  ] as Weighted<number>,
  soloBars: [8, 8, 16],
  breakdown: { chance: 0.45, bars: [4, 8] },
  drumBreakChance: 0.7,
  lift: {
    first: 0.55,
    again: 0.3,
    steps: [
      [1, 2],
      [2, 3],
      [3, 1],
    ] as Weighted<number>,
  },
  finalChoruses: [
    [1, 2],
    [2, 4],
    [3, 1],
  ] as Weighted<number>,
  outroChance: 0.75, // its style and length are in variants.ts
};

// The furthest the last choruses lift the key, in semitones. Instruments
// keep this much room below their top note.
export const MAX_SHIFT = 4;
