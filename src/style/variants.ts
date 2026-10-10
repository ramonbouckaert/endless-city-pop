// The ways a section type can be played. A section picks one of its
// type's variants by weight (a lift or a later solo never the way the
// one before it was), and its recipe in engine/sections/ gives each a
// texture of its own. A type whose variants sound different has a groove
// (drums and bass) for each, here; the others' grooves are in rhythm.ts.

import type { Odds } from '../lib/random';
import { PRE_MELODIES, type MelodyStyle } from './melody';
import type { GroovePlan } from './rhythm';

export interface Variant {
  weight: number;
}
export type Variants<N extends string, V extends Variant = Variant> = Readonly<Record<N, V>>;
/** A variant with a groove of its own. */
export interface Grooved extends Variant {
  groove: GroovePlan;
}

// Intro arrangements.
export type IntroTexture = 'pads' | 'keys' | 'groove' | 'bassFirst' | 'arp' | 'drumsFirst' | 'fanfare';
export const INTRO_TEXTURES: Variants<IntroTexture, Grooved> = {
  pads: {
    weight: 1,
    groove: { drums: { feels: { introRide: 1 }, crash: 0, fill: 0 }, bass: { pedal: 1, halfTime: 1 } },
  },
  keys: {
    weight: 1,
    groove: { drums: { feels: { introRide: 1 }, crash: 0, fill: 0 }, bass: { pedal: 1, halfTime: 1 } },
  },
  groove: {
    weight: 1,
    groove: { drums: { feels: { funk: 1, disco: 1 }, crash: 0, fill: 1 }, bass: { funk: 2, disco: 1 } },
  },
  bassFirst: {
    weight: 1,
    groove: { drums: { feels: { introRide: 1, halfTime: 1 }, crash: 0, fill: 1 }, bass: { funk: 1, halfTime: 1 } },
  },
  arp: {
    weight: 1,
    groove: { drums: { feels: { introRide: 1, halfTime: 1 }, crash: 0, fill: 1 }, bass: { pedal: 1, halfTime: 1 } },
  },
  drumsFirst: {
    weight: 1,
    groove: { drums: { feels: { break: 1, funk: 1, disco: 1 }, crash: 0, fill: 1 }, bass: { funk: 1, disco: 1 } },
  },
  fanfare: {
    weight: 1,
    groove: { drums: { feels: { funk: 1, disco: 1 }, crash: 1, fill: 1 }, bass: { drive: 1, disco: 1 } },
  },
};

// How the drums start the opening vamp: in after two bars, kick and hats
// alone for two bars, or the whole kit from the first. (When the vamp
// comes back, the band is already going: the whole kit.)
export type VampEntry = 'late' | 'light' | 'full';
export const VAMP_ENTRIES: Odds<VampEntry> = { late: 5, light: 3, full: 2 };

// Each song's pre-chorus takes one flavour: its progressions (in each
// tonality, fitted to end on their cadence into the chorus), melody,
// drums and bass.
export type PreFlavour = 'climb' | 'pedal' | 'drop' | 'stops' | 'borrowed';
export const PRE_FLAVOURS: Variants<PreFlavour, Grooved & { melody: MelodyStyle }> = {
  // A stepwise rise to the dominant, the band opening up into the chorus.
  climb: {
    weight: 3,
    melody: PRE_MELODIES.climb,
    groove: {
      drums: { feels: { build: 1, funk: 1, disco: 1 }, crash: 0.2, fill: 1 },
      bass: { drive: 1, funk: 1, disco: 1 },
    },
  },
  // Suspense over a held dominant (or IV over it): long notes, strings swelling.
  pedal: {
    weight: 2,
    melody: PRE_MELODIES.hold,
    groove: { drums: { feels: { halfTime: 1, introRide: 1 }, crash: 0, fill: 1 }, bass: { pedal: 1, halfTime: 1 } },
  },
  // The drums drop out and come back halfway.
  drop: {
    weight: 2,
    melody: PRE_MELODIES.question,
    groove: { drums: { feels: { funk: 1, disco: 1 }, crash: 0, fill: 1 }, bass: { halfTime: 1, pedal: 1, funk: 1 } },
  },
  // Stop-time: the band hits together under a free lead, all in for the last bar.
  stops: {
    weight: 2,
    melody: PRE_MELODIES.question,
    groove: { drums: { feels: { funk: 1, disco: 1 }, crash: 0.5, fill: 1 }, bass: { drive: 1, disco: 1 } },
  },
  // Darker colour borrowed from the minor key: iv, bIII, bVI, bVII.
  borrowed: {
    weight: 2,
    melody: PRE_MELODIES.climb,
    groove: { drums: { feels: { halfTime: 1, build: 1 }, crash: 0.3, fill: 1 }, bass: { halfTime: 1, drive: 1 } },
  },
};

// What a solo is played over: the band, or a bossa comp. The first solo
// is always over the band; a later one is never over what the one before
// it had.
export type SoloComp = 'band' | 'bossa';
export const SOLO_COMPS: Variants<SoloComp, Grooved> = {
  band: {
    weight: 1,
    groove: { drums: { feels: { funk: 1, disco: 1 }, crash: 1, fill: 0.9 }, bass: { funk: 1, drive: 1, disco: 1 } },
  },
  bossa: {
    weight: 1,
    groove: { drums: { feels: { bossa: 2, halfTime: 1 }, crash: 0.7, fill: 0.8 }, bass: { bossa: 2, halfTime: 1 } },
  },
};

// How a lift into a last chorus is played: a rising horn line, band
// hits, the drums dropping out, a run up into the chorus, or the drums
// alone.
export type LiftStyle = 'horns' | 'stops' | 'drop' | 'run' | 'drums';
export const LIFT_STYLES: Odds<LiftStyle> = { horns: 3, stops: 2, drop: 2, run: 2, drums: 1 };

// How the song winds down before the finale: the intro's chords again,
// quietly, or a pared-back vamp (ride or half-time drums) while two
// soloists trade two-bar lines, each getting two turns. Picked with the
// form, as it sets the outro's length.
export type OutroStyle = 'reprise' | 'trade';
export const OUTRO_STYLES: Variants<OutroStyle, Grooved & { bars: number }> = {
  reprise: {
    weight: 1,
    bars: 4,
    groove: { drums: { feels: { introRide: 1, halfTime: 1 }, crash: 1, fill: 0 }, bass: { pedal: 1 } },
  },
  trade: {
    weight: 1,
    bars: 8,
    groove: {
      drums: { feels: { introRide: 1, halfTime: 1, bossa: 1 }, crash: 0, fill: 1 },
      bass: { halfTime: 1, pedal: 1, bossa: 1 },
    },
  },
};

// How the last chord rings out: voices stacking up it one by one, band
// hits, a slide down from a semitone above, or a run up it.
export type FinaleStyle = 'cascade' | 'hits' | 'slide' | 'run';
export const FINALE_STYLES: Odds<FinaleStyle> = { cascade: 3, hits: 2, slide: 2, run: 2 };
