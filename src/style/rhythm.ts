// Drums and bass per section: the drum feels it may take, how likely it
// starts with a crash and ends with a fill, and the bass feels it may
// take. A section whose variants (variants.ts) each sound different has
// a groove for each.

import type { Odds } from '../lib/random';
import type { BassFeel } from './bass';
import type { DrumFeel } from './drums';
import type { SoloComp, IntroTexture, OutroStyle, PreFlavour } from './variants';

export interface DrumPlan {
  feels: Odds<DrumFeel>;
  crash: number; // chance of a crash on the first bar
  fill: number; // chance of a fill at the end
}
export interface GroovePlan {
  drums: DrumPlan;
  bass: Odds<BassFeel>;
}

/** Every section the band plays through: one groove plan, or one for each of its variants. */
export interface Rhythms {
  vamp: GroovePlan;
  verse: GroovePlan;
  chorus: GroovePlan;
  bridge: GroovePlan;
  riff: GroovePlan;
  breakdown: GroovePlan;
  lift: GroovePlan;
  intro: Readonly<Record<IntroTexture, GroovePlan>>;
  pre: Readonly<Record<PreFlavour, GroovePlan>>;
  solo: Readonly<Record<SoloComp, GroovePlan>>;
  outro: Readonly<Record<OutroStyle, GroovePlan>>;
}

export const RHYTHM: Readonly<Rhythms> = {
  vamp: { drums: { feels: { funk: 1 }, crash: 0, fill: 1 }, bass: { funk: 2, disco: 1 } },
  verse: {
    drums: { feels: { funk: 2, halfTime: 1, disco: 1 }, crash: 0.3, fill: 0.7 },
    bass: { funk: 2, drive: 1, halfTime: 1 },
  },
  chorus: { drums: { feels: { disco: 2, funk: 1 }, crash: 1, fill: 0.9 }, bass: { disco: 2, funk: 1, drive: 1 } },
  bridge: {
    drums: { feels: { halfTime: 2, bossa: 1, introRide: 1 }, crash: 0.3, fill: 0.5 },
    bass: { halfTime: 2, pedal: 1, bossa: 1 },
  },
  riff: { drums: { feels: { funk: 1, disco: 1 }, crash: 1, fill: 1 }, bass: { funk: 1, disco: 1 } },
  breakdown: {
    drums: { feels: { claps: 1, halfTime: 1 }, crash: 0, fill: 1 },
    bass: { disco: 1, halfTime: 1, pedal: 1 },
  },
  lift: { drums: { feels: { build: 1 }, crash: 1, fill: 0 }, bass: { disco: 1, drive: 1 } },
  intro: {
    pads: { drums: { feels: { introRide: 1 }, crash: 0, fill: 0 }, bass: { pedal: 1, halfTime: 1 } },
    keys: { drums: { feels: { introRide: 1 }, crash: 0, fill: 0 }, bass: { pedal: 1, halfTime: 1 } },
    groove: { drums: { feels: { funk: 1, disco: 1 }, crash: 0, fill: 1 }, bass: { funk: 2, disco: 1 } },
    bassFirst: { drums: { feels: { introRide: 1, halfTime: 1 }, crash: 0, fill: 1 }, bass: { funk: 1, halfTime: 1 } },
    arp: { drums: { feels: { introRide: 1, halfTime: 1 }, crash: 0, fill: 1 }, bass: { pedal: 1, halfTime: 1 } },
    drumsFirst: { drums: { feels: { break: 1, funk: 1, disco: 1 }, crash: 0, fill: 1 }, bass: { funk: 1, disco: 1 } },
    fanfare: { drums: { feels: { funk: 1, disco: 1 }, crash: 1, fill: 1 }, bass: { drive: 1, disco: 1 } },
  },
  pre: {
    // The band opening up into the chorus.
    climb: {
      drums: { feels: { build: 1, funk: 1, disco: 1 }, crash: 0.2, fill: 1 },
      bass: { drive: 1, funk: 1, disco: 1 },
    },
    pedal: { drums: { feels: { halfTime: 1, introRide: 1 }, crash: 0, fill: 1 }, bass: { pedal: 1, halfTime: 1 } },
    drop: {
      drums: { feels: { funk: 1, disco: 1 }, crash: 0, fill: 1 },
      bass: { halfTime: 1, pedal: 1, funk: 1 },
    },
    stops: { drums: { feels: { funk: 1, disco: 1 }, crash: 0.5, fill: 1 }, bass: { drive: 1, disco: 1 } },
    borrowed: { drums: { feels: { halfTime: 1, build: 1 }, crash: 0.3, fill: 1 }, bass: { halfTime: 1, drive: 1 } },
  },
  solo: {
    band: { drums: { feels: { funk: 1, disco: 1 }, crash: 1, fill: 0.9 }, bass: { funk: 1, drive: 1, disco: 1 } },
    bossa: { drums: { feels: { bossa: 2, halfTime: 1 }, crash: 0.7, fill: 0.8 }, bass: { bossa: 2, halfTime: 1 } },
  },
  outro: {
    reprise: { drums: { feels: { introRide: 1, halfTime: 1 }, crash: 1, fill: 0 }, bass: { pedal: 1 } },
    trade: {
      drums: { feels: { introRide: 1, halfTime: 1, bossa: 1 }, crash: 0, fill: 1 },
      bass: { halfTime: 1, pedal: 1, bossa: 1 },
    },
  },
};

// A drum break's drums: it has no bass line.
export const DRUM_BREAK: DrumPlan = { feels: { break: 1 }, crash: 0, fill: 1 };

// Bass feels that sit with a quieter drum feel.
export const BASS_WITH: Readonly<Partial<Record<DrumFeel, readonly BassFeel[]>>> = {
  bossa: ['bossa', 'halfTime', 'pedal'],
  halfTime: ['halfTime', 'pedal', 'funk', 'bossa'],
  introRide: ['pedal', 'halfTime', 'funk'],
};
