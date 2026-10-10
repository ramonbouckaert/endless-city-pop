// Song form: which sections a song may have, how long, and how often.
// Every song has an intro, a verse, a chorus and a final chord; the rest
// is optional, so songs range from a short verse-chorus-solo tune to a
// long one with several rounds, two soloists, a bridge, a breakdown and
// a key change. (What each section is, its name and whether it hands
// over to anything, is on its class, in engine/sections/.)

import type { Weighted } from '../lib/random';

export const FORM = {
  // 0: no pre-chorus
  preBars: [
    [0, 1],
    [2, 1],
    [4, 2],
    [6, 1],
    [8, 1],
  ] as Weighted<number>,
  chorusTag: 0.45,
  rounds: [
    [1, 2],
    [2, 5],
    [3, 2],
  ] as Weighted<number>,
  riffChance: [0, 0.4, 0.7],
  introBars: [
    [4, 2],
    [8, 1],
  ] as Weighted<number>,
  vamp: {
    chance: 0.6,
    bars: [4, 8],
    returns: 0.45,
  },
  verseBars: [
    [8, 2],
    [16, 1],
  ] as Weighted<number>,
  bridgeChance: 0.65,
  soloists: [0, 1, 2, 3],
  soloCount: [
    [0, 1],
    [1, 4],
    [2, 3],
  ] as Weighted<number>,
  soloBars: [
    [8, 2],
    [16, 1],
  ] as Weighted<number>,
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
