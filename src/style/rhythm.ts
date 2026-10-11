// Drums and bass per section: the drum feels it may take, how likely it
// starts with a crash and ends with a fill, and the bass feels it may
// take. A section whose variants each sound different has a groove for
// each, on the variant (variants.ts); the rest have one each, here.

import type { Odds } from '../lib/random';
import type { BassFeel } from './bass';
import type { DrumFeel } from './drums';

export interface DrumPlan {
  feels: Odds<DrumFeel>;
  crash: number; // chance of a crash on the first bar
  fill: number; // chance of a fill at the end
}
export interface GroovePlan {
  drums: DrumPlan;
  bass: Odds<BassFeel>;
}

/** The groove of each section the band plays through without variants of its own. */
export const GROOVES = {
  vamp: { drums: { feels: { funk: 1 }, crash: 0, fill: 1 }, bass: { funk: 2, disco: 1, riff: 1 } },
  verse: {
    drums: { feels: { funk: 2, halfTime: 1, disco: 1 }, crash: 0.3, fill: 0.7 },
    bass: { funk: 2, drive: 1, halfTime: 1, riff: 0.5 },
  },
  chorus: { drums: { feels: { disco: 2, funk: 1 }, crash: 1, fill: 0.9 }, bass: { disco: 2, funk: 1, drive: 1 } },
  bridge: {
    drums: { feels: { halfTime: 2, bossa: 1, introRide: 1, fusion: 1 }, crash: 0.3, fill: 0.5 },
    bass: { halfTime: 2, pedal: 1, bossa: 1 },
  },
  riff: { drums: { feels: { funk: 1, disco: 1 }, crash: 1, fill: 1 }, bass: { funk: 1, disco: 1 } },
  breakdown: {
    drums: { feels: { claps: 1, halfTime: 1 }, crash: 0, fill: 1 },
    bass: { disco: 1, halfTime: 1, pedal: 1 },
  },
  lift: { drums: { feels: { build: 1 }, crash: 1, fill: 0 }, bass: { disco: 1, drive: 1 } },
  link: { drums: { feels: { funk: 1, halfTime: 1 }, crash: 0, fill: 1 }, bass: { pedal: 1, funk: 1 } },
} satisfies Record<string, GroovePlan>;

// A drum break's drums: it has no bass line.
export const DRUM_BREAK: DrumPlan = { feels: { break: 1 }, crash: 0, fill: 1 };

// Bass feels that sit with a quieter drum feel.
export const BASS_WITH: Readonly<Partial<Record<DrumFeel, readonly BassFeel[]>>> = {
  bossa: ['bossa', 'halfTime', 'pedal'],
  halfTime: ['halfTime', 'pedal', 'funk', 'bossa'],
  introRide: ['pedal', 'halfTime', 'funk'],
  fusion: ['pop', 'riff', 'funk', 'halfTime', 'pedal'],
};
