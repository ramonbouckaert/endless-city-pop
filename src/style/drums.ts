// Drum feels as recipes, and the settings the drum writer rolls within.
// A bar is 16 steps of gains (lib/steps); drums are General MIDI
// percussion keys (PERCUSSION).

import { PERCUSSION, type Percussion } from '../lib/general-midi';
import type { Odds, Range, Weighted } from '../lib/random';
import { at, empty, steps, type StepGains } from '../lib/steps';

export type DrumFeel =
  | 'funk'
  | 'disco'
  | 'halfTime'
  | 'fusion'
  | 'bossa'
  | 'introRide'
  | 'claps'
  | 'build'
  | 'break'
  | 'ballad';
export type DrumRole = 'kick' | 'snare' | 'ghost' | 'hat' | 'perc';

export interface DrumVoice {
  drum: Percussion;
  role: DrumRole;
  bars: readonly StepGains[]; // choices; a recipe picks one
  weight?: number; // how often a recipe picks it among others (default 1)
}

// One step of a drum feel's recipe, run in order.
export type DrumStep =
  | { op: 'kicks'; required: readonly number[]; optional: Weighted<number>; gain: number }
  | {
      op: 'backbeat';
      steps: readonly number[];
      gain: number;
      // Keep `steps` with probability `keep`, else play `steps` from here.
      orElse?: { keep: number; steps: readonly number[] };
    }
  | { op: 'ghosts'; density: Range; avoid: readonly number[] }
  | { op: 'cymbal'; sixteenths: number; ride: number; loud: number }
  // Open hats on the offbeats if the cymbal is a hi-hat; else one on four.
  | { op: 'openHats'; chance: number }
  // One of `voices` (perhaps), playing one of its bars.
  | { op: 'voice'; chance?: number; voices: readonly DrumVoice[] };

export interface DrumRecipe {
  steps: readonly DrumStep[];
  openOnFour?: boolean; // an open hat may close the phrase
  steady?: boolean; // no variation in bar four
  quiet?: boolean; // softer fills
}

// A snare roll, a run round the toms, the two mixed, kick and snare in
// unison, or everything stopping for a snare pickup.
export type FillKind = 'roll' | 'toms' | 'mixed' | 'unison' | 'stop';

const BEATS = [0, 4, 8, 12];
export const EIGHTH_OFFS = [2, 6, 10, 14];

// Extra percussion: shaker, tambourine or cowbell.
const EXTRAS: readonly DrumVoice[] = [
  { drum: PERCUSSION.shaker, role: 'perc', bars: [empty().map((_, i) => (i % 2 ? 0.06 : 0.1))], weight: 2 },
  {
    drum: PERCUSSION.tambourine,
    role: 'perc',
    bars: [at({ 4: 0.12, 12: 0.12 }), at({ 2: 0.1, 6: 0.1, 10: 0.1, 14: 0.1 })],
  },
  { drum: PERCUSSION.cowbell, role: 'perc', bars: [BEATS, [0, 6, 10], [2, 8, 14]].map((list) => steps(list, 0.08)) },
];
const percussion = (chance: number) => ({ op: 'voice', chance, voices: EXTRAS }) as const;

// Latin percussion over the kit, as fusion layers it: maracas in eighths,
// wood blocks on a cross figure, congas or bongos.
const LATIN: readonly DrumVoice[] = [
  {
    drum: PERCUSSION.maracas,
    role: 'perc',
    bars: [steps([0, 2, 4, 6, 8, 10, 12, 14], (i) => (i % 4 ? 0.07 : 0.11))],
    weight: 2,
  },
  {
    drum: PERCUSSION.highWoodBlock,
    role: 'perc',
    bars: [
      [2, 5, 8, 11, 14],
      [0, 3, 6, 10, 12],
      [2, 6, 9, 12, 14],
    ].map((list) => steps(list, 0.08)),
  },
  {
    drum: PERCUSSION.lowConga,
    role: 'perc',
    bars: [at({ 6: 0.1, 7: 0.08, 14: 0.1, 15: 0.08 }), at({ 3: 0.08, 6: 0.1, 11: 0.08, 14: 0.1 })],
  },
  {
    drum: PERCUSSION.openHighConga,
    role: 'perc',
    bars: [at({ 4: 0.09, 10: 0.07, 12: 0.09 }), at({ 2: 0.08, 10: 0.08 })],
  },
  // Bongos (Stay With Me's): the martillo's eighths, high and low.
  {
    drum: PERCUSSION.highBongo,
    role: 'perc',
    bars: [
      at({ 0: 0.08, 2: 0.06, 4: 0.07, 6: 0.06, 8: 0.08, 10: 0.06, 12: 0.07 }),
      at({ 2: 0.07, 3: 0.05, 10: 0.07, 11: 0.05 }),
    ],
  },
  { drum: PERCUSSION.lowBongo, role: 'perc', bars: [at({ 6: 0.08, 14: 0.08 }), at({ 7: 0.07, 14: 0.08, 15: 0.06 })] },
];
const latin = (chance: number) => ({ op: 'voice', chance, voices: LATIN }) as const;

// Hand percussion an intro brings in one at a time (J-Cycle's): a
// triangle, a bell tree in triplets, wood blocks. Each a bar's hits, in
// sixteenths of 4/4 (triplets between them).
export interface LayerHit {
  drum: Percussion;
  at: number;
  gain: number;
}
export const LAYERS: readonly (readonly LayerHit[])[] = [
  [
    { drum: PERCUSSION.openTriangle, at: 0, gain: 0.1 },
    { drum: PERCUSSION.openTriangle, at: 8, gain: 0.07 },
  ],
  [8, 8 + 8 / 3, 8 + 16 / 3].map((at) => ({ drum: PERCUSSION.bellTree, at, gain: 0.06 })),
  [
    { drum: PERCUSSION.highWoodBlock, at: 0, gain: 0.08 },
    { drum: PERCUSSION.highWoodBlock, at: 3, gain: 0.06 },
    { drum: PERCUSSION.lowWoodBlock, at: 6, gain: 0.07 },
    { drum: PERCUSSION.highWoodBlock, at: 10, gain: 0.06 },
    { drum: PERCUSSION.lowWoodBlock, at: 12, gain: 0.07 },
  ],
];

// The backbeat's drum(s), and how often each plays it.
export const BACKBEATS: Weighted<Percussion[]> = [
  [[PERCUSSION.snare], 4],
  [[PERCUSSION.snare, PERCUSSION.clap], 2],
  [[PERCUSSION.clap], 1],
  [[PERCUSSION.sideStick], 0.5],
  [[PERCUSSION.electricSnare], 1],
];

// Each feel's groove, as steps rolled in order.
export const DRUM_FEELS: Readonly<Record<DrumFeel, DrumRecipe>> = {
  funk: {
    openOnFour: true,
    steps: [
      {
        op: 'kicks',
        required: [0],
        optional: [
          [3, 0.4],
          [6, 0.35],
          [7, 0.2],
          [8, 0.4],
          [10, 0.55],
          [11, 0.3],
          [14, 0.3],
          [15, 0.15],
        ],
        gain: 0.75,
      },
      { op: 'backbeat', steps: [4, 12], gain: 0.5, orElse: { keep: 0.85, steps: [4, 12, 15] } },
      { op: 'ghosts', density: [0.05, 0.35], avoid: [4, 12] },
      { op: 'cymbal', sixteenths: 0.7, ride: 0.15, loud: 1 },
      percussion(0.3),
      latin(0.15),
    ],
  },
  disco: {
    steps: [
      {
        op: 'kicks',
        required: BEATS,
        optional: [
          [3, 0.15],
          [7, 0.1],
          [14, 0.15],
          [15, 0.15],
        ],
        gain: 0.78,
      },
      { op: 'backbeat', steps: [4, 12], gain: 0.48 },
      { op: 'cymbal', sixteenths: 0.6, ride: 0.1, loud: 0.8 },
      { op: 'openHats', chance: 0.75 }, // the disco signature
      percussion(0.45),
      latin(0.1),
    ],
  },
  halfTime: {
    quiet: true,
    steps: [
      {
        op: 'kicks',
        required: [0],
        optional: [
          [3, 0.2],
          [6, 0.3],
          [10, 0.4],
          [11, 0.3],
          [14, 0.25],
        ],
        gain: 0.6,
      },
      { op: 'backbeat', steps: [8], gain: 0.45 },
      { op: 'ghosts', density: [0, 0.2], avoid: [8] },
      {
        op: 'voice',
        chance: 0.5,
        voices: [{ drum: PERCUSSION.sideStick, role: 'perc', bars: [at({ 4: 0.08, 12: 0.08 })] }],
      },
      { op: 'cymbal', sixteenths: 0.3, ride: 0.35, loud: 0.7 },
      percussion(0.25),
      latin(0.2),
    ],
  },
  // Half-time fusion: kick and a late backbeat under the pedal hi-hat on
  // the offbeats and the ride's bell on the beats, Latin percussion over it.
  fusion: {
    steps: [
      {
        op: 'kicks',
        required: [0],
        optional: [
          [3, 0.3],
          [6, 0.4],
          [10, 0.5],
          [11, 0.3],
          [13, 0.3],
        ],
        gain: 0.7,
      },
      { op: 'backbeat', steps: [8], gain: 0.5, orElse: { keep: 0.6, steps: [7, 12] } },
      { op: 'ghosts', density: [0.1, 0.35], avoid: [7, 8, 12] },
      {
        op: 'voice',
        voices: [
          {
            drum: PERCUSSION.pedalHat,
            role: 'hat',
            bars: [steps([2, 6, 10, 14], 0.12), steps([2, 4, 6, 10, 12, 14], (i) => (i % 4 ? 0.12 : 0.08))],
          },
        ],
      },
      {
        op: 'voice',
        voices: [
          {
            drum: PERCUSSION.rideBell,
            role: 'hat',
            bars: [steps([0, 4, 8, 12], 0.1), steps([0, 4, 8, 10, 12], (i) => (i % 4 ? 0.07 : 0.1))],
          },
        ],
      },
      latin(0.7),
    ],
  },
  bossa: {
    quiet: true,
    steps: [
      {
        op: 'voice',
        voices: [
          {
            drum: PERCUSSION.kick,
            role: 'kick',
            bars: [
              [0, 6, 8, 14],
              [0, 3, 4, 7, 8, 11, 12, 15],
              [0, 8],
            ].map((list) => steps(list, (i) => (i % 4 ? 0.4 : 0.55))),
          },
        ],
      },
      // Cross-stick on a clave figure.
      {
        op: 'voice',
        voices: [
          {
            drum: PERCUSSION.sideStick,
            role: 'snare',
            bars: [
              [0, 3, 6, 10, 13],
              [0, 3, 7, 10, 12],
              [2, 6, 10, 12],
              [3, 6, 10, 14],
            ].map((list) => steps(list, 0.2)),
          },
        ],
      },
      { op: 'cymbal', sixteenths: 0, ride: 0.6, loud: 0.6 },
      {
        op: 'voice',
        chance: 0.5,
        voices: [
          {
            drum: PERCUSSION.shaker,
            role: 'perc',
            bars: [
              empty().map((_, i) => {
                if (i % 2) {
                  return 0;
                }
                return i % 4 ? 0.06 : 0.1;
              }),
            ],
          },
        ],
      },
    ],
  },
  introRide: {
    quiet: true,
    steady: true,
    steps: [
      { op: 'cymbal', sixteenths: 0, ride: 0.75, loud: 0.45 },
      {
        op: 'voice',
        chance: 0.6,
        voices: [{ drum: PERCUSSION.sideStick, role: 'snare', bars: [at({ 12: 0.1 }), at({ 4: 0.08, 12: 0.1 })] }],
      },
      { op: 'voice', chance: 0.4, voices: [{ drum: PERCUSSION.kick, role: 'kick', bars: [at({ 0: 0.35 })] }] },
    ],
  },
  claps: {
    steps: [
      { op: 'kicks', required: BEATS, optional: [], gain: 0.55 },
      { op: 'voice', voices: [{ drum: PERCUSSION.clap, role: 'snare', bars: [at({ 4: 0.45, 12: 0.45 })] }] },
      percussion(0.5),
    ],
  },
  build: {
    steps: [
      { op: 'kicks', required: BEATS, optional: [], gain: 0.7 },
      // Snare in eighths or quarters, getting louder.
      {
        op: 'voice',
        voices: [
          {
            drum: PERCUSSION.snare,
            role: 'snare',
            bars: [2, 4].map((every) => empty().map((_, i) => (i % every ? 0 : 0.18 + (i / 16) * 0.2))),
          },
        ],
      },
      { op: 'cymbal', sixteenths: 0.3, ride: 0, loud: 0.6 },
    ],
  },
  // A ballad's: kick on one and three, cross-stick on two and four, the
  // ride or hats in eighths, a shaker now and then.
  ballad: {
    quiet: true,
    steps: [
      {
        op: 'kicks',
        required: [0, 8],
        optional: [
          [6, 0.15],
          [14, 0.2],
        ],
        gain: 0.5,
      },
      { op: 'voice', voices: [{ drum: PERCUSSION.sideStick, role: 'snare', bars: [at({ 4: 0.2, 12: 0.2 })] }] },
      { op: 'cymbal', sixteenths: 0, ride: 0.5, loud: 0.6 },
      percussion(0.15),
    ],
  },
  // Drums alone: a busy funk groove.
  break: {
    openOnFour: true,
    steps: [
      {
        op: 'kicks',
        required: [0, 10],
        optional: [
          [3, 0.6],
          [6, 0.5],
          [7, 0.4],
          [8, 0.4],
          [11, 0.4],
          [14, 0.4],
        ],
        gain: 0.75,
      },
      { op: 'backbeat', steps: [4, 12], gain: 0.5 },
      { op: 'ghosts', density: [0.25, 0.5], avoid: [4, 12] },
      { op: 'cymbal', sixteenths: 0.85, ride: 0.1, loud: 1.1 },
    ],
  },
};

export const DRUMS = {
  kickDensity: [0.4, 1] as Range,
  kickSoft: [0.7, 0.95] as Range,
  ghostGain: [0.05, 0.1] as Range,
  cymbal: { accent: [0.14, 0.24] as Range, mid: [0.4, 0.7] as Range, weak: [0.2, 0.45] as Range, offbeat: 0.25 },
  rideLevel: 0.7,
  vary: { chance: 0.7, drop: 0.5, steps: [3, 7, 10, 11, 14, 15], gains: [0.5, 0.6, 0.7] },
  openOnFour: { chance: 0.6, gain: 0.14 },
  openHatGain: 0.13,
};

// Fills: where they start and what they are, in a loud feel and a quiet one.
export const FILLS = {
  count: 3,
  starts: {
    loud: [
      [12, 3],
      [8, 4],
      [0, 1],
    ] as Weighted<number>,
    quiet: [
      [12, 3],
      [8, 4],
    ] as Weighted<number>,
  },
  kinds: {
    loud: { roll: 3, toms: 3, mixed: 2, unison: 1, stop: 1 } as Odds<FillKind>,
    quiet: { roll: 3, toms: 1, mixed: 0.5, unison: 1, stop: 0.3 } as Odds<FillKind>,
  },
  mixed: [
    [PERCUSSION.snare, 3],
    [PERCUSSION.highTom, 1],
    [PERCUSSION.midTom, 1],
    [PERCUSSION.lowTom, 1],
    [PERCUSSION.kick, 1],
  ] as Weighted<Percussion>,
  sixteenths: 0.65,
  quietLevel: 0.6,
};
