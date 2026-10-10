// The ways a section type can be played. A section picks one of its
// type's variants by weight (a lift or a later solo never the way the
// one before it was), and its recipe in engine/sections/ gives each a
// texture of its own; some have a groove of their own, in RHYTHM.

import type { PreMelody } from './melody';

export interface Variant {
  weight: number;
}
export type Variants<N extends string, V extends Variant = Variant> = Readonly<Record<N, V>>;

// Intro arrangements.
export type IntroTexture = 'pads' | 'keys' | 'groove' | 'bassFirst' | 'arp' | 'drumsFirst' | 'fanfare';
export const INTRO_TEXTURES: Variants<IntroTexture> = {
  pads: { weight: 1 },
  keys: { weight: 1 },
  groove: { weight: 1 },
  bassFirst: { weight: 1 },
  arp: { weight: 1 },
  drumsFirst: { weight: 1 },
  fanfare: { weight: 1 },
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
export const PRE_FLAVOURS: Variants<PreFlavour, Variant & { melody: PreMelody }> = {
  // A stepwise rise to the dominant, the band opening up.
  climb: { weight: 3, melody: 'climb' },
  // Suspense over a held dominant (or IV over it): long notes, strings swelling.
  pedal: { weight: 2, melody: 'hold' },
  // The drums drop out and come back halfway.
  drop: { weight: 2, melody: 'question' },
  // Stop-time: the band hits together under a free lead, all in for the last bar.
  stops: { weight: 2, melody: 'question' },
  // Darker colour borrowed from the minor key: iv, bIII, bVI, bVII.
  borrowed: { weight: 2, melody: 'climb' },
};

// What a solo is played over: the band, or a bossa comp. The first solo
// is always over the band; a later one is never over what the one before
// it had.
export type SoloComp = 'band' | 'bossa';
export const SOLO_COMPS: Variants<SoloComp> = {
  band: { weight: 1 },
  bossa: { weight: 1 },
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
export const OUTRO_STYLES: Variants<OutroStyle, Variant & { bars: number }> = {
  reprise: { weight: 1, bars: 4 },
  trade: { weight: 1, bars: 8 },
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
