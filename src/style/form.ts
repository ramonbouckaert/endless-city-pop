// Song form: which sections a song may have, how long, and how often.
// Every song has an intro, a chorus and a final chord; the rest is
// optional, so songs range from a short verse-chorus-solo tune to a long
// one with several rounds, two soloists, a bridge, a breakdown and a key
// change, or (fusion's way, J-Cycle's) an intro and a vamp into a
// sixteen-bar theme with no verses, a solo, and the theme again. (What
// each section is, its name and whether it hands over to anything, is on
// its class, in engine/sections/.)

import type { Weighted } from '../lib/random';

export const FORM = {
  // How often a song has verses (and pre-choruses) before its choruses.
  verseChance: 0.85,
  // 0: no pre-chorus
  preBars: [
    [0, 1],
    [2, 1],
    [4, 2],
    [6, 1],
    [8, 1],
  ] as Weighted<number>,
  // A chorus: eight bars; ten, with a two-bar tag; or sixteen, a theme in
  // four-bar phrases.
  chorusBars: [
    [8, 5],
    [10, 4],
    [16, 2],
  ] as Weighted<number>,
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
  // How often a song holds one moment of tension mid-song on a fermata:
  // the last bar of a pre-chorus, bridge, breakdown or lift, slowed and
  // held (FERMATA).
  fermataChance: 0.3,
};

// The furthest the last choruses lift the key, in semitones. Instruments
// keep this much room below their top note.
export const MAX_SHIFT = 4;
