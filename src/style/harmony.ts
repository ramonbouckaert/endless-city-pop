// How the style colours and reharmonises chords.

import type { Weighted } from '../lib/random';
import type { ChordClass } from '../theory';

export type PaletteName = ChordClass | 'majLydian' | 'domToMinor' | 'susToMinor' | 'minTonic' | 'domTonic';

// Colours for each chord family; majLydian is a major chord away from
// the tonic, domToMinor a dominant resolving to a minor chord (or a
// minor key's V), susToMinor a minor key's sus V.
export const PALETTE: Readonly<Record<PaletteName, Weighted<string>>> = {
  maj: [
    ['^9', 3],
    ['^7', 1],
    ['69', 1],
  ],
  majLydian: [
    ['^9#11', 2],
    ['^7#11', 2],
    ['^9', 1],
  ],
  min: [
    ['m9', 3],
    ['m11', 2],
    ['m7', 1],
  ],
  dom: [
    ['13', 3],
    ['9', 2],
    ['9sus', 1],
  ],
  domToMinor: [
    ['7alt', 3],
    ['7b9', 1],
    ['13b9', 1],
  ],
  // A minor key's suspended V: phrygian, or the plain 9sus.
  susToMinor: [
    ['7b9sus', 2],
    ['9sus', 1],
  ],
  hdim: [['m7b5', 1]],
  dim: [['o7', 1]],
  sus: [
    ['9sus', 2],
    ['13', 1],
  ],
  power: [['9sus', 1]],
  // A minor key's tonic: aeolian m9, dorian m6/9, or the melodic-minor m(maj9).
  minTonic: [
    ['m9', 3],
    ['m69', 2],
    ['m^9', 1],
    ['m11', 1],
  ],
  // A mixolydian key's tonic: a dominant that doesn't resolve, sometimes the funk #9.
  domTonic: [
    ['13', 3],
    ['9', 2],
    ['7#9', 1],
  ],
};

// `amount`: how much a section is reharmonised (0..1, times the
// tonality's own reharm); the rest are chances at that amount.
export const REHARM = {
  amount: 0.5,
  tritone: 0.3,
  relatedII: 0.4,
  secondary: 0.35,
  secondaryTritone: 0.3,
  iiSymbols: ['m9', 'm7', 'm11'],
  toMinor: ['7alt', '7b9'],
  toMajor: ['13', '9', '7#9'],
};

// How far a bridge strays: distant keys are favoured over close ones by this much (0..1).
export const ADVENTUROUS = 0.8;

export const TONIC_CHORDS: Readonly<Record<string, string>> = { maj: 'Imaj7', min: 'i7', dom: 'I7' };

// Solo changes: the steps between a solo's pair keys, and where the first pair starts.
export const SOLO_CHANGES = {
  steps: [
    [3, 3],
    [-2, 2],
    [5, 1],
    [-1, 1],
  ] as Weighted<number>,
  starts: [0, 2, 9],
};

// Planing intros start on bIII or bVI.
export const PLANING_STARTS = [3, 8];
