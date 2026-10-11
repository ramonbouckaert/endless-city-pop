// How the style colours and reharmonises chords.

import type { Odds, Weighted } from '../lib/random';
import type { ChordClass } from '../theory';

export type PaletteName =
  | ChordClass
  | 'majLydian'
  | 'majBorrowed'
  | 'minPhrygian'
  | 'domToMinor'
  | 'susToMinor'
  | 'minTonic'
  | 'minPhrygianTonic'
  | 'domTonic'
  | 'slashMaj'
  | 'slashMin'
  | 'slashDom';

// Colours for each chord family; majLydian is a major chord away from
// the tonic, majBorrowed one off the key where a tonality wants it plain
// (Tonality.borrowedPalette), minPhrygian a minor chord on the key's
// phrygian degree (whose 9th is off the key: Em7 in C), domToMinor a
// dominant resolving to a minor chord (or a minor key's V), susToMinor a
// minor key's sus V; the slash palettes are for chords over a bass not
// their root.
export const PALETTE: Readonly<Record<PaletteName, Odds<string>>> = {
  maj: { '^9': 3, '^7': 1, '69': 1 },
  majLydian: { '^9#11': 2, '^7#11': 2, '^9': 1 },
  majBorrowed: { add9: 2, '': 1, '69': 1 },
  min: { m9: 3, m11: 2, m7: 1 },
  minPhrygian: { m7: 1 },
  dom: { '13': 3, '9': 2, '9sus': 1 },
  domToMinor: { '7alt': 3, '7b9': 1, '13b9': 1 },
  // A minor key's suspended V: phrygian, or the plain 9sus.
  susToMinor: { '7b9sus': 2, '9sus': 1 },
  hdim: { m7b5: 1 },
  dim: { o7: 1 },
  sus: { '9sus': 2, '7sus': 1 },
  power: { '9sus': 1 },
  aug: { '7#5': 1 },
  // A minor key's tonic: aeolian m9 and m11, or the dorian m6/9.
  minTonic: { m9: 3, m11: 2, m69: 2 },
  // A phrygian key's tonic: its 9th is off the key, so an 11th over the m7.
  minPhrygianTonic: { m7add11: 2, m7: 1 },
  // A mixolydian key's tonic: a dominant that doesn't resolve, sometimes the funk #9.
  domTonic: { '13': 3, '9': 2, '7#9': 1 },
  // A chord over a bass not its root (an inversion, a line cliché, an
  // upper structure such as A/B): plainer, so the bass note rings true.
  slashMaj: { '': 2, add9: 2, '^7': 1 },
  slashMin: { m7: 2, m: 1, madd9: 1 },
  slashDom: { '7': 2, '9': 1 },
};

// How a song colours its chords: lush (PALETTE: ninths, elevenths,
// thirteenths, altered dominants), plain (seventh chords and add9s, as
// Dolphin in Town's), or triadic (triads and add9s, as Sparkle's and Sea
// Line's). A plain or triadic song draws a palette's colours from its
// own table here where it has one, and is reharmonised less (`reharm`).
export type Colour = 'lush' | 'plain' | 'triadic';
export const COLOURS: Readonly<
  Record<Colour, { palettes: Partial<Record<PaletteName, Odds<string>>>; reharm: number }>
> = {
  lush: { palettes: {}, reharm: 1 },
  plain: {
    reharm: 0.6,
    palettes: {
      maj: { '^7': 3, add9: 1 },
      majLydian: { '^7': 2, '^7#11': 1, add9: 1 },
      majBorrowed: { '': 1, add9: 1, '^7': 1 },
      min: { m7: 3, m9: 1 },
      minTonic: { m7: 3, m9: 1 },
      dom: { '7': 3, '9': 1 },
      domTonic: { '7': 3, '9': 1 },
      domToMinor: { '7b9': 2, '7': 1 },
      sus: { '7sus': 1 },
      susToMinor: { '7sus': 1 },
      power: { '7sus': 1 },
    },
  },
  triadic: {
    reharm: 0.3,
    palettes: {
      maj: { '': 2, add9: 2 },
      majLydian: { '': 2, add9: 2 },
      majBorrowed: { '': 2, add9: 1 },
      min: { m: 2, madd9: 1, m7: 1 },
      minTonic: { m: 1, madd9: 2 },
      minPhrygian: { m: 1 },
      minPhrygianTonic: { m: 1, m7add11: 1 },
      dom: { '7': 1 },
      domTonic: { '7': 1 },
      domToMinor: { '7': 1, '7b9': 1 },
      sus: { '7sus': 1, sus: 1 },
      susToMinor: { '7sus': 1 },
      power: { '7sus': 1 },
      slashMaj: { '': 2, add9: 1 },
      slashMin: { m: 1 },
      slashDom: { '7': 1 },
    },
  },
};

// Where a substitute goes in a bar its chord had to itself: in its
// place (`whole`), in the second half after it (`after`: Cmaj7 Em7), or
// in the first half, resolving into it (`before`: Em7 Cmaj7).
export type Placing = 'whole' | 'after' | 'before';

// `amount`: how much a section is reharmonised (0..1, times the
// tonality's own reharm); the rest are chances at that amount. A
// stand-in is a diatonic chord a third away sharing most of a chord's
// notes (iii or vi for I, IV for ii); a tritone sub (a stand-in for a
// dominant) never comes before its chord, a stand-in for the key's
// tonic never takes its whole bar.
export const REHARM = {
  amount: 0.5,
  tritone: 0.3,
  tritonePlacing: { whole: 2, after: 1 } as Odds<Placing>,
  relatedII: 0.4,
  secondary: 0.35,
  secondaryTritone: 0.3,
  standIn: 0.35,
  standInPlacing: { whole: 1, after: 2, before: 1 } as Odds<Placing>,
  iiSymbols: ['m9', 'm7', 'm11'],
  toMinor: ['7alt', '7b9'],
  toMajor: ['13', '9', '7#9'],
};

// How far a bridge strays: distant keys are favoured over close ones by this much (0..1).
export const ADVENTUROUS = 0.8;

export const TONIC_CHORDS: Readonly<Record<string, string>> = { maj: 'Imaj7', min: 'i7', dom: 'I7' };

// Solo changes: the steps between a solo's pair keys, where the first
// pair starts, and the side-slips of an outside solo: four bars of the
// tonic chord, each this many semitones off home.
export const SOLO_CHANGES = {
  // A sidestep's lead-in: a sus pedal rocking IV to V, then a ii-V
  // borrowed from a tritone away (J-Cycle's B section: Dsus Esus, Fm7 Bb7).
  sidestep: 'IV7sus V7sus IV7sus V7sus bvi7 bII7',
  steps: [
    [3, 3],
    [-2, 2],
    [5, 1],
    [-1, 1],
  ] as Weighted<number>,
  starts: [0, 2, 9],
  outside: [
    [[1, 1, -1, -1], 2],
    [[-1, 6, 1, 0], 1],
    [[6, 6, 1, 1], 1],
    [[1, 3, 6, -1], 1],
  ] as Weighted<readonly number[]>,
};

// Planing intros start on bIII or bVI.
export const PLANING_STARTS = [3, 8];
