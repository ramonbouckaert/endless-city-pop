// The ways a section type can be played. A section picks one of its
// type's variants by weight (a lift or a later solo never the way the
// one before it was), and its recipe in engine/sections/ gives each a
// texture of its own. A type whose variants sound different has a groove
// (drums and bass) for each, here; the others' grooves are in rhythm.ts.

import type { Odds } from '../lib/random';
import type { SongEnding } from './form';
import { PRE_MELODIES, type MelodyStyle } from './melody';
import { RIDE_ALONE, type GroovePlan } from './rhythm';

export interface Variant {
  weight: number;
}
export type Variants<N extends string, V extends Variant = Variant> = Readonly<Record<N, V>>;
/** A variant with a groove of its own. */
export interface Grooved extends Variant {
  groove: GroovePlan;
}

// Intro arrangements.
export type IntroTexture =
  | 'pads'
  | 'keys'
  | 'groove'
  | 'bassFirst'
  | 'arp'
  | 'drumsFirst'
  | 'fanfare'
  | 'ostinato'
  | 'rubato';
export const INTRO_TEXTURES: Variants<IntroTexture, Grooved> = {
  pads: {
    weight: 1,
    groove: { drums: RIDE_ALONE, bass: { pedal: 1, halfTime: 1 } },
  },
  keys: {
    weight: 1,
    groove: { drums: RIDE_ALONE, bass: { pedal: 1, halfTime: 1 } },
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
  ostinato: {
    weight: 1,
    groove: {
      drums: { feels: { halfTime: 1, funk: 1, fusion: 1 }, crash: 0, fill: 1 },
      bass: { pedal: 1, halfTime: 1 },
    },
  },
  // Out of tempo: keys and a pad alone, slowing into each bar's last beat
  // and holding the last chord (RUBATO); a free intro's always.
  rubato: {
    weight: 0.5,
    groove: { drums: RIDE_ALONE, bass: { pedal: 1 } },
  },
};

// A rubato intro's pace: each bar at `bar` of the song's tempo, its last
// beat slowing to `beat`, the last bar's held chord to `hold`.
export const RUBATO = { bar: 0.75, beat: 0.6, hold: 0.45 };

// How a verse is played: the band in full; sparse, bass, side-stick and
// soft keys under the lead; building, the band coming in through it, a
// part at a time, into the chorus (RIDE ON TIME's); or the keys alone
// under the lead (Oh No, Oh Yes!'s piano: only in a song leaning towards
// a ballad, its weight scaled by how far, BALLAD).
export type VerseTexture = 'full' | 'sparse' | 'build' | 'alone';
export const VERSE_TEXTURES: Variants<VerseTexture, Grooved> = {
  full: {
    weight: 4,
    groove: {
      drums: { feels: { funk: 2, halfTime: 1, disco: 1 }, crash: 0.3, fill: 0.7 },
      bass: { funk: 2, drive: 1, halfTime: 1, riff: 0.5, push: 0.5 },
    },
  },
  sparse: {
    weight: 1,
    groove: {
      drums: { feels: { introRide: 1, halfTime: 1 }, crash: 0, fill: 0.7 },
      bass: { pedal: 1, halfTime: 1, push: 1 },
    },
  },
  build: {
    weight: 1.5,
    groove: { drums: { feels: { funk: 1, disco: 1 }, crash: 0, fill: 1 }, bass: { funk: 1, disco: 1, drive: 1 } },
  },
  // (Its weight fully leaning; its drums never play; its bass joins in later verses.)
  alone: {
    weight: 2,
    groove: { drums: RIDE_ALONE, bass: { pedal: 1, ballad: 1 } },
  },
};

// How the drums start the opening vamp: in after two bars, kick and hats
// alone for two bars, or the whole kit from the first. (When the vamp
// comes back, the band is already going: the whole kit.)
export type VampEntry = 'late' | 'light' | 'full';
export const VAMP_ENTRIES: Odds<VampEntry> = { late: 5, light: 3, full: 2 };

// How later choruses answer the hook: figures in the gaps it leaves
// (every other bar, every bar in the last chorus), one riff repeated
// there, the hook's tail echoed high, or a held line over it, a note to a
// chord.
export type AnswerStyle = 'fills' | 'riff' | 'echo' | 'line';
export const ANSWER_STYLES: Odds<AnswerStyle> = { fills: 3, riff: 2, echo: 2, line: 2 };

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
    groove: {
      drums: { feels: { funk: 2, disco: 2, fusion: 1 }, crash: 1, fill: 0.9 },
      bass: { funk: 2, drive: 2, disco: 2, pop: 1, push: 0.5 },
    },
  },
  bossa: {
    weight: 1,
    groove: {
      drums: { feels: { bossa: 2, halfTime: 1 }, crash: 0.7, fill: 0.8 },
      bass: { bossa: 2, halfTime: 1, walk: 1.5 },
    },
  },
};

// What changes a solo is played over: the mode's own solo changes
// (pairs cycling through keys, SoloChangesWriter); one of the song's own
// progressions looped (as most real songs do): the chorus's (in a song
// with a chorus), the verse's (in a song with verses), the intro's or the
// vamp's; or an interlude, a vamp in a borrowed key (a bridge's), leading
// home.
export type SoloOver = 'cycle' | 'chorus' | 'verse' | 'intro' | 'vamp' | 'interlude';
export const SOLO_OVER: Odds<SoloOver> = { cycle: 3, chorus: 3, verse: 2, intro: 1, vamp: 2, interlude: 1 };

// How a lift into a last chorus is played: a rising horn line, band
// hits, the drums dropping out, a run up into the chorus, or the drums
// alone.
export type LiftStyle = 'horns' | 'stops' | 'drop' | 'run' | 'drums';
export const LIFT_STYLES: Odds<LiftStyle> = { horns: 3, stops: 2, drop: 2, run: 1, drums: 1 };

// How the song winds down: before the finale, the intro's chords again,
// quietly, or a pared-back vamp (ride or half-time drums) while two
// soloists trade two-bar lines, each getting two turns; before the
// finale or fading out, a coda (a soloist over its two-bar approach home,
// never landing: before the finale, fifteen bars end on its ii,
// Sparkle's), or a soloist over a cadence home looping (one of the key's
// outro templates: Summer Suspicion's bVI-V+-i); in a song that fades
// out, two soloists trading, a loop of the verse's chords under a new
// hook, or the chorus's chords looping with a soloist over them in place
// of the lead (Sea Line's trombone); a loop runs sixteen bars, or
// twenty-four (Plastic Love's). Picked with the form, as it sets the
// outro's length: `bars`, the lengths it may have before each ending it
// may lead to.
export type OutroStyle = 'reprise' | 'trade' | 'coda' | 'cadence' | 'loop' | 'obbligato';
export const OUTRO_STYLES: Variants<
  OutroStyle,
  Grooved & { bars: Readonly<Partial<Record<SongEnding, readonly number[]>>> }
> = {
  reprise: {
    weight: 1,
    bars: { finale: [4] },
    groove: { drums: { feels: { introRide: 1, halfTime: 1 }, crash: 1, fill: 0 }, bass: { pedal: 1 } },
  },
  trade: {
    weight: 1,
    bars: { finale: [8], fade: [8] },
    groove: {
      drums: { feels: { introRide: 1, halfTime: 1, bossa: 1 }, crash: 0, fill: 1 },
      bass: { halfTime: 1, pedal: 1, bossa: 1 },
    },
  },
  coda: {
    weight: 1,
    bars: { finale: [16, 15], fade: [16] },
    groove: {
      drums: { feels: { funk: 2, disco: 1 }, crash: 1, fill: 0.5 },
      bass: { funk: 2, disco: 1, pop: 1 },
    },
  },
  cadence: {
    weight: 0.7,
    bars: { finale: [8, 12], fade: [8, 12] },
    groove: {
      drums: { feels: { halfTime: 2, funk: 1 }, crash: 1, fill: 0.5 },
      bass: { halfTime: 1, pedal: 1 },
    },
  },
  loop: {
    weight: 1,
    bars: { fade: [16, 24] },
    groove: {
      drums: { feels: { funk: 1, disco: 1 }, crash: 1, fill: 0.5 },
      bass: { funk: 1, disco: 1, riff: 1 },
    },
  },
  obbligato: {
    weight: 0.7,
    bars: { fade: [16] },
    groove: {
      drums: { feels: { funk: 2, disco: 2, halfTime: 1 }, crash: 1, fill: 0.5 },
      bass: { funk: 2, disco: 1, push: 1 },
    },
  },
};

// How the last chord rings out: voices stacking up it one by one, band
// hits, a slide down from a semitone above, a run up it, a fermata, or
// (onto the tonic suspended) a bar of the bIImaj7#11 above it first, the
// neapolitan (J-Cycle's ending, Oh No, Oh Yes!'s colour).
export type FinaleStyle = 'cascade' | 'hits' | 'slide' | 'run' | 'fermata' | 'neapolitan';
export const FINALE_STYLES: Odds<FinaleStyle> = {
  cascade: 3,
  hits: 2,
  slide: 2,
  run: 2,
  fermata: 1.5,
  // (Only ever against the others that suit the tonic suspended, FINALE_SUITS.)
  neapolitan: 3.3,
};

// What the last chord is: the key's own final chord; in a minor key, a
// major one (a picardy third, Plastic Love's); or one left open: the
// tonic suspended (sus2, or a 9sus: J-Cycle's I7sus), the ii (add9; in a
// minor key, the tonic suspended instead), the V suspended, or the first
// chord of the section before, as if it went round again; or (only after
// the riff played to the end, Flyday Chinatown's) the bare tonic, root
// and fifth, always hit.
export type FinaleChord = 'tonic' | 'picardy' | 'sus' | 'ii' | 'V' | 'section' | 'unison';
export const FINALE_CHORDS: Odds<FinaleChord> = { tonic: 6, picardy: 0.7, sus: 2.2, ii: 1, V: 1, section: 1 };
// The last chords some styles suit (a style not named here suits any):
// only the tonic slides or ends on a fermata, whose figures resolve it;
// the neapolitan slides onto the tonic suspended.
export const FINALE_SUITS: Readonly<Partial<Record<FinaleStyle, readonly FinaleChord[]>>> = {
  slide: ['tonic'],
  fermata: ['tonic'],
  neapolitan: ['sus'],
};
// What the last chord is after some outros, in place of FINALE_CHORDS:
// after a coda, its own first chord (its ii, as Sparkle's ends), the ii,
// or at last the tonic; after a cadence, the tonic suspended (Summer
// Suspicion's) or the tonic.
export const FINALE_AFTER: Readonly<Partial<Record<OutroStyle, Odds<FinaleChord>>>> = {
  coda: { section: 2, ii: 1, tonic: 2 },
  cadence: { sus: 2, tonic: 2 },
};
// How often a last chord (but a fermata's) is rung out slower, the tempo
// easing to `scale`'s first then its second halfway through its first
// bar (Sparkle's, 102 down to 71).
export const FINALE_EASE = { chance: 0.3, scale: [0.85, 0.7] as const };

// How a short bar plays: a 2/4 break, the band hitting the next chord
// then a snare pickup, or the drums round the toms; a 1/4 pickup on the
// snare, or a horn run up into the downbeat.
export type ShortBarStyle = 'hit' | 'toms' | 'snare' | 'run';
export const SHORT_BARS: { break: Odds<ShortBarStyle>; pickup: Odds<ShortBarStyle> } = {
  break: { hit: 3, toms: 1 },
  pickup: { snare: 2, run: 1 },
};
