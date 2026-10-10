// Song-wide choices: tempo and swing, and the ways each section type can
// be played (each with the drums and bass that suit it). The arranger
// gives each way its own texture.

import type { Weighted } from '../lib/random';
import type { Range } from '../lib/random';
import type { PreMelody } from './melody';
import type { GroovePlan } from './rhythm';

export const SONG = {
  tempo: [92, 124] as Range, // BPM: city pop's easy end to its brisker one
  swing: [0.06, 0.12] as Range,
};

// How an intro gets its harmony: the chorus's first four bars (with the
// hook as a teaser), planing add9 chords, or an intro template (perhaps
// with a riff of its own, `melodyChance`).
export type IntroHarmony = 'chorus' | 'planing' | 'template';
export const INTRO = {
  harmony: [
    ['chorus', 3],
    ['planing', 2],
    ['template', 6],
  ] as Weighted<IntroHarmony>,
  melodyChance: 0.5,
};

// Intro arrangements, with the bass feels each may take and their drums.
export type IntroTexture = 'pads' | 'keys' | 'groove' | 'bassFirst' | 'arp' | 'drumsFirst' | 'fanfare';
export const INTRO_TEXTURES: Readonly<Record<IntroTexture, GroovePlan>> = {
  pads: { bass: ['pedal', 'halfTime'], drums: { feels: ['introRide'], crash: 0, fill: 0 } },
  keys: { bass: ['pedal', 'halfTime'], drums: { feels: ['introRide'], crash: 0, fill: 0 } },
  groove: { bass: ['funk', 'funk', 'disco'], drums: { feels: ['funk', 'disco'], crash: 0, fill: 1 } },
  bassFirst: { bass: ['funk', 'halfTime'], drums: { feels: ['introRide', 'halfTime'], crash: 0, fill: 1 } },
  arp: { bass: ['pedal', 'halfTime'], drums: { feels: ['introRide', 'halfTime'], crash: 0, fill: 1 } },
  drumsFirst: { bass: ['funk', 'disco'], drums: { feels: ['break', 'funk', 'disco'], crash: 0, fill: 1 } },
  fanfare: { bass: ['drive', 'disco'], drums: { feels: ['funk', 'disco'], crash: 1, fill: 1 } },
};

// How the drums start the opening vamp: in after two bars, kick and hats
// alone for two bars, or the whole kit from the first.
export type DrumEntry = 'late' | 'light' | 'full';
export const VAMP_ENTRY: Weighted<DrumEntry> = [
  ['late', 5],
  ['light', 3],
  ['full', 2],
];

// Each song's pre-chorus takes one flavour: its progressions (in each
// tonality, fitted to end on their cadence into the chorus), melody,
// drums and bass.
export type PreFlavour = 'climb' | 'pedal' | 'drop' | 'stops' | 'borrowed';
export interface PreFlavourDef extends GroovePlan {
  weight: number;
  melody: PreMelody;
}
export const PRE_FLAVOURS: Readonly<Record<PreFlavour, PreFlavourDef>> = {
  // A stepwise rise to the dominant, the band opening up.
  climb: {
    weight: 3,
    melody: 'climb',
    drums: { feels: ['build', 'funk', 'disco'], crash: 0.2, fill: 1 },
    bass: ['drive', 'funk', 'disco'],
  },
  // Suspense over a held dominant (or IV over it): long notes, strings swelling.
  pedal: {
    weight: 2,
    melody: 'hold',
    drums: { feels: ['halfTime', 'introRide'], crash: 0, fill: 1 },
    bass: ['pedal', 'halfTime'],
  },
  // The drums drop out and come back halfway.
  drop: {
    weight: 2,
    melody: 'question',
    drums: { feels: ['funk', 'disco'], crash: 0, fill: 1 },
    bass: ['halfTime', 'pedal', 'funk'],
  },
  // Stop-time: the band hits together under a free lead, all in for the last bar.
  stops: {
    weight: 2,
    melody: 'question',
    drums: { feels: ['funk', 'disco'], crash: 0.5, fill: 1 },
    bass: ['drive', 'disco'],
  },
  // Darker colour borrowed from the minor key: iv, bIII, bVI, bVII.
  borrowed: {
    weight: 2,
    melody: 'climb',
    drums: { feels: ['halfTime', 'build'], crash: 0.3, fill: 1 },
    bass: ['halfTime', 'drive'],
  },
};

// How a lift into a last chorus is played: a rising horn line, band
// hits, the drums dropping out, a run up into the chorus, or the drums
// alone. Never the same way twice running.
export type LiftStyle = 'horns' | 'stops' | 'drop' | 'run' | 'drums';
export const LIFT_STYLES: Weighted<LiftStyle> = [
  ['horns', 3],
  ['stops', 2],
  ['drop', 2],
  ['run', 2],
  ['drums', 1],
];

// How the last chord rings out: voices stacking up it one by one, band
// hits, a slide down from a semitone above, or a run up it.
export type FinaleStyle = 'cascade' | 'hits' | 'slide' | 'run';
export const FINALE_STYLES: Weighted<FinaleStyle> = [
  ['cascade', 3],
  ['hits', 2],
  ['slide', 2],
  ['run', 2],
];
