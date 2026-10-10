// The ways a section type can be played. A section picks one of its
// type's variants by weight (a lift or a later solo never the way the
// one before it was), and its recipe in engine/sections/ gives each a
// texture of its own. A variant with a groove plays it in place of its
// type's in RHYTHM.

import type { PreMelody } from './melody';
import type { GroovePlan } from './rhythm';

export interface Variant {
  weight: number;
}
export type Variants<N extends string, V extends Variant = Variant> = Readonly<Record<N, V>>;
type Grooved = Variant & { groove: GroovePlan };

// Intro arrangements, each with its drums and the bass feels it may take.
export type IntroTexture = 'pads' | 'keys' | 'groove' | 'bassFirst' | 'arp' | 'drumsFirst' | 'fanfare';
export const INTRO_TEXTURES: Variants<IntroTexture, Grooved> = {
  pads: { weight: 1, groove: { bass: ['pedal', 'halfTime'], drums: { feels: ['introRide'], crash: 0, fill: 0 } } },
  keys: { weight: 1, groove: { bass: ['pedal', 'halfTime'], drums: { feels: ['introRide'], crash: 0, fill: 0 } } },
  groove: {
    weight: 1,
    groove: { bass: ['funk', 'funk', 'disco'], drums: { feels: ['funk', 'disco'], crash: 0, fill: 1 } },
  },
  bassFirst: {
    weight: 1,
    groove: { bass: ['funk', 'halfTime'], drums: { feels: ['introRide', 'halfTime'], crash: 0, fill: 1 } },
  },
  arp: {
    weight: 1,
    groove: { bass: ['pedal', 'halfTime'], drums: { feels: ['introRide', 'halfTime'], crash: 0, fill: 1 } },
  },
  drumsFirst: {
    weight: 1,
    groove: { bass: ['funk', 'disco'], drums: { feels: ['break', 'funk', 'disco'], crash: 0, fill: 1 } },
  },
  fanfare: { weight: 1, groove: { bass: ['drive', 'disco'], drums: { feels: ['funk', 'disco'], crash: 1, fill: 1 } } },
};

// How the drums start the opening vamp: in after two bars, kick and hats
// alone for two bars, or the whole kit from the first. (When the vamp
// comes back, the band is already going: the whole kit.)
export type VampEntry = 'late' | 'light' | 'full';
export const VAMP_ENTRIES: Variants<VampEntry> = {
  late: { weight: 5 },
  light: { weight: 3 },
  full: { weight: 2 },
};

// Each song's pre-chorus takes one flavour: its progressions (in each
// tonality, fitted to end on their cadence into the chorus), melody,
// drums and bass.
export type PreFlavour = 'climb' | 'pedal' | 'drop' | 'stops' | 'borrowed';
export const PRE_FLAVOURS: Variants<PreFlavour, Grooved & { melody: PreMelody }> = {
  // A stepwise rise to the dominant, the band opening up.
  climb: {
    weight: 3,
    melody: 'climb',
    groove: { drums: { feels: ['build', 'funk', 'disco'], crash: 0.2, fill: 1 }, bass: ['drive', 'funk', 'disco'] },
  },
  // Suspense over a held dominant (or IV over it): long notes, strings swelling.
  pedal: {
    weight: 2,
    melody: 'hold',
    groove: { drums: { feels: ['halfTime', 'introRide'], crash: 0, fill: 1 }, bass: ['pedal', 'halfTime'] },
  },
  // The drums drop out and come back halfway.
  drop: {
    weight: 2,
    melody: 'question',
    groove: { drums: { feels: ['funk', 'disco'], crash: 0, fill: 1 }, bass: ['halfTime', 'pedal', 'funk'] },
  },
  // Stop-time: the band hits together under a free lead, all in for the last bar.
  stops: {
    weight: 2,
    melody: 'question',
    groove: { drums: { feels: ['funk', 'disco'], crash: 0.5, fill: 1 }, bass: ['drive', 'disco'] },
  },
  // Darker colour borrowed from the minor key: iv, bIII, bVI, bVII.
  borrowed: {
    weight: 2,
    melody: 'climb',
    groove: { drums: { feels: ['halfTime', 'build'], crash: 0.3, fill: 1 }, bass: ['halfTime', 'drive'] },
  },
};

// What a solo is played over: the band, or a bossa comp. The first solo
// is always over the band; a later one is never over what the one before
// it had.
export type SoloComp = 'band' | 'bossa';
export const SOLO_COMPS: Variants<SoloComp, Grooved> = {
  band: {
    weight: 1,
    groove: { drums: { feels: ['funk', 'disco'], crash: 1, fill: 0.9 }, bass: ['funk', 'drive', 'disco'] },
  },
  bossa: {
    weight: 1,
    groove: {
      drums: { feels: ['bossa', 'bossa', 'halfTime'], crash: 0.7, fill: 0.8 },
      bass: ['bossa', 'bossa', 'halfTime'],
    },
  },
};

// How a lift into a last chorus is played: a rising horn line, band
// hits, the drums dropping out, a run up into the chorus, or the drums
// alone.
export type LiftStyle = 'horns' | 'stops' | 'drop' | 'run' | 'drums';
export const LIFT_STYLES: Variants<LiftStyle> = {
  horns: { weight: 3 },
  stops: { weight: 2 },
  drop: { weight: 2 },
  run: { weight: 2 },
  drums: { weight: 1 },
};

// How the song winds down before the finale: the intro's chords again,
// quietly, or a pared-back vamp (ride or half-time drums) while two
// soloists trade two-bar lines, each getting two turns. Picked with the
// form, as it sets the outro's length.
export type OutroStyle = 'reprise' | 'trade';
export const OUTRO_STYLES: Variants<OutroStyle, Grooved & { bars: number }> = {
  reprise: {
    weight: 1,
    bars: 4,
    groove: { drums: { feels: ['introRide', 'halfTime'], crash: 1, fill: 0 }, bass: ['pedal'] },
  },
  trade: {
    weight: 1,
    bars: 8,
    groove: {
      drums: { feels: ['introRide', 'halfTime', 'bossa'], crash: 0, fill: 1 },
      bass: ['halfTime', 'pedal', 'bossa'],
    },
  },
};

// How the last chord rings out: voices stacking up it one by one, band
// hits, a slide down from a semitone above, or a run up it.
export type FinaleStyle = 'cascade' | 'hits' | 'slide' | 'run';
export const FINALE_STYLES: Variants<FinaleStyle> = {
  cascade: { weight: 3 },
  hits: { weight: 2 },
  slide: { weight: 2 },
  run: { weight: 2 },
};
