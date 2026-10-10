// Drums and bass per section: the drum feels it may take, how likely it
// starts with a crash and ends with a fill, and the bass feels it may
// take. Sections whose variants each have a groove of their own (intro,
// pre-chorus, solo, outro) take it from variants.ts.

import type { BassFeel } from './bass';
import type { DrumFeel } from './drums';

export interface DrumPlan {
  feels: readonly DrumFeel[];
  crash: number; // chance of a crash on the first bar
  fill: number; // chance of a fill at the end
}
export interface GroovePlan {
  drums: DrumPlan;
  bass: readonly BassFeel[];
}

// The sections with one plan for all songs.
export type GrooveSection = 'vamp' | 'verse' | 'chorus' | 'bridge' | 'riff' | 'breakdown' | 'lift';

export const RHYTHM: Readonly<Record<GrooveSection, GroovePlan>> = {
  vamp: { drums: { feels: ['funk'], crash: 0, fill: 1 }, bass: ['funk', 'funk', 'disco'] },
  verse: {
    drums: { feels: ['funk', 'funk', 'halfTime', 'disco'], crash: 0.3, fill: 0.7 },
    bass: ['funk', 'funk', 'drive', 'halfTime'],
  },
  chorus: {
    drums: { feels: ['disco', 'disco', 'funk'], crash: 1, fill: 0.9 },
    bass: ['disco', 'disco', 'funk', 'drive'],
  },
  bridge: {
    drums: { feels: ['halfTime', 'halfTime', 'bossa', 'introRide'], crash: 0.3, fill: 0.5 },
    bass: ['halfTime', 'halfTime', 'pedal', 'bossa'],
  },
  riff: { drums: { feels: ['funk', 'disco'], crash: 1, fill: 1 }, bass: ['funk', 'disco'] },
  breakdown: { drums: { feels: ['claps', 'halfTime'], crash: 0, fill: 1 }, bass: ['disco', 'halfTime', 'pedal'] },
  lift: { drums: { feels: ['build'], crash: 1, fill: 0 }, bass: ['disco', 'drive'] },
};

// A drum break's drums: it has no bass line.
export const DRUM_BREAK: DrumPlan = { feels: ['break'], crash: 0, fill: 1 };

// Bass feels that sit with a quieter drum feel.
export const BASS_WITH: Readonly<Partial<Record<DrumFeel, readonly BassFeel[]>>> = {
  bossa: ['bossa', 'halfTime', 'pedal'],
  halfTime: ['halfTime', 'pedal', 'funk', 'bossa'],
  introRide: ['pedal', 'halfTime', 'funk'],
};
