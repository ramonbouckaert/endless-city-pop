// Song form: which sections a song may have, how long, and how often.
// Every song has an intro, a verse, a chorus and a final chord; the rest
// is optional, so songs range from a short verse-chorus-solo tune to a
// long one with several rounds, two soloists, a bridge, a breakdown and
// a key change.

import type { Weighted } from '../lib/random';

// Every type of section, and what the rest of the code needs to know of
// each: its name on the page, a short one for narrow spaces, whether the
// band plays through it (chords, drums and bass), and whether it hands
// over to anything (so the opening vamp may come back after it; a verse
// leads on to its pre-chorus or chorus).
export interface SectionTypeDef {
  label: string;
  short: string;
  played: boolean;
  handsOver: boolean;
}

export const SECTION_TYPES = {
  intro: { label: 'intro', short: 'i', played: true, handsOver: false },
  vamp: { label: 'vamp', short: 'vp', played: true, handsOver: false },
  verse: { label: 'verse', short: 'v', played: true, handsOver: false },
  pre: { label: 'pre', short: 'p', played: true, handsOver: false },
  chorus: { label: 'chorus', short: 'c', played: true, handsOver: true },
  riff: { label: 'riff', short: 'r', played: true, handsOver: true },
  bridge: { label: 'bridge', short: 'b', played: true, handsOver: true },
  solo: { label: 'solo', short: 's', played: true, handsOver: true },
  breakdown: { label: 'breakdown', short: 'bd', played: true, handsOver: true },
  drumBreak: { label: 'drum break', short: 'd', played: false, handsOver: false },
  lift: { label: 'lift', short: 'l', played: true, handsOver: false },
  outro: { label: 'outro', short: 'o', played: true, handsOver: false },
  finale: { label: 'finale', short: 'f', played: false, handsOver: false },
} as const satisfies Readonly<Record<string, SectionTypeDef>>;

export type SectionType = keyof typeof SECTION_TYPES;
/** The section types the band plays through. */
export type PlayedType = {
  [T in SectionType]: (typeof SECTION_TYPES)[T]['played'] extends true ? T : never;
}[SectionType];

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
