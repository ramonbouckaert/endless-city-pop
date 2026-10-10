// Drums and bass per section: the drum feels it may take, how likely it
// starts with a crash and ends with a fill, and the bass feels it may
// take (none for a drum break, which has no bass line).

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

// The sections with one plan for all songs. The intro's depends on its
// texture and the pre-chorus's on its flavour (song.ts).
export type GrooveSection =
  | 'vamp'
  | 'verse'
  | 'chorus'
  | 'bridge'
  | 'solo'
  | 'riff'
  | 'breakdown'
  | 'lift'
  | 'outro'
  | 'drumBreak';

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
  solo: { drums: { feels: ['funk', 'disco'], crash: 1, fill: 0.9 }, bass: ['funk', 'drive', 'disco'] },
  riff: { drums: { feels: ['funk', 'disco'], crash: 1, fill: 1 }, bass: ['funk', 'disco'] },
  breakdown: { drums: { feels: ['claps', 'halfTime'], crash: 0, fill: 1 }, bass: ['disco', 'halfTime', 'pedal'] },
  lift: { drums: { feels: ['build'], crash: 1, fill: 0 }, bass: ['disco', 'drive'] },
  outro: { drums: { feels: ['introRide', 'halfTime'], crash: 1, fill: 0 }, bass: ['pedal'] },
  drumBreak: { drums: { feels: ['break'], crash: 0, fill: 1 }, bass: [] },
};

// The second solo, over a bossa comp.
export const BOSSA_SOLO: GroovePlan = {
  drums: { feels: ['bossa', 'bossa', 'halfTime'], crash: 0.7, fill: 0.8 },
  bass: ['bossa', 'bossa', 'halfTime'],
};

// The trade outro's backing, pared back under the soloists: ride or
// half-time drums and a bass to match.
export const TRADE_OUTRO: GroovePlan = {
  drums: { feels: ['introRide', 'halfTime', 'bossa'], crash: 0, fill: 1 },
  bass: ['halfTime', 'pedal', 'bossa'],
};

// Bass feels that sit with a quieter drum feel.
export const BASS_WITH: Readonly<Partial<Record<DrumFeel, readonly BassFeel[]>>> = {
  bossa: ['bossa', 'halfTime', 'pedal'],
  halfTime: ['halfTime', 'pedal', 'funk', 'bossa'],
  introRide: ['pedal', 'halfTime', 'funk'],
};
