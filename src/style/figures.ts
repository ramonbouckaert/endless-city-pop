// Fixed rhythms and figures the arrangement plays, as data: for each
// bar, its hits on a sixteenth-note grid, [step, length in steps], and
// for a figure a value on each: an index into a chord's voicing or a
// scale degree. engine/score/score.ts places them in time.

/** A rhythm: for each bar, its hits on a sixteenth-note grid, [step, length in steps]. It loops. */
export type Rhythm = readonly (readonly (readonly [step: number, len: number])[])[];
/** A figure: a rhythm with a value on every hit. It loops. */
export type Figure<V> = readonly (readonly (readonly [step: number, len: number, value: V])[])[];

// One bar of hits every `every` sixteenths, each `len` long.
const every = (step: number, len = step): Rhythm => [
  Array.from({ length: 16 / step }, (_, i) => [i * step, len] as const),
];

export const RHYTHMS = {
  whole: [[[0, 16]]],
  quarters: every(4),
  eighths: every(2),
  offbeats: [
    [
      [2, 2],
      [6, 2],
      [10, 2],
      [14, 2],
    ],
  ],
  stab: [[[0, 4]]],
  // Pushed hits, the band together: on one, the and of two, and four.
  stops: [
    [
      [0, 2],
      [6, 2],
      [12, 2],
    ],
  ],
} satisfies Record<string, Rhythm>;

// Keyboard comping rhythms.
export const COMP = {
  main: [
    [
      [6, 2],
      [14, 1],
    ],
  ],
  chorus: RHYTHMS.offbeats,
  bossa: [
    [
      [0, 1],
      [3, 1],
      [6, 1],
      [9, 1],
      [12, 1],
    ],
  ],
} satisfies Record<string, Rhythm>;

// Notes on consecutive sixteenths from step `from`.
const run = (from: number, notes: readonly number[]): Figure<number>[number] => notes.map((n, i) => [from + i, 1, n]);

// A bar of the ostinato: notes of a voicing (4 and up: an octave up), one a sixteenth.
const OSTINATO = run(0, [5, 0, 3, 4, 1, 5, 4, 2, 3, 1, 5, 4, 0, 2, 3, 4]);

// Figures on a chord's voicing (notes counted up from its lowest) or on a scale (degrees).
export const FIGURES = {
  // Up the chord's voicing in eighths, twice a bar.
  arp: [[0, 1, 2, 3, 0, 1, 2, 3].map((n, i) => [i * 2, 2, n] as const)],
  scratch: [
    [
      [0, 1, 0],
      [2, 1, 0],
      [3, 1, 2],
      [5, 1, 1],
      [7, 1, 0],
      [9, 1, 0],
      [10, 1, 2],
      [12, 1, 1],
      [14, 1, 0],
    ],
  ],
  // Two bars of a rising horn line.
  liftLine: [
    [
      [0, 4, 0],
      [6, 2, 1],
      [8, 4, 2],
      [14, 2, 3],
    ],
    [
      [0, 4, 4],
      [6, 2, 4],
      [8, 4, 5],
    ],
  ],
  liftHold: [[[0, 12, 4]]],
  liftRun: [run(4, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])],
  // Two bass notes leading into the next bar.
  pickup: [
    [
      [12, 2, -2],
      [14, 2, -1],
    ],
  ],
  // A broken chord in sixteenths on the bells (J-Cycle's kalimba), up
  // and round the voicing and its octave; the fourth bar ends on a
  // sixteenth-note triplet tumbling down it.
  ostinato: [
    OSTINATO,
    OSTINATO,
    OSTINATO,
    [...OSTINATO.slice(0, 12), ...[4, 3, 2, 1, 0, -1].map((n, i) => [12 + (2 * i) / 3, 2 / 3, n] as const)],
  ],
  // Up the chord in sixteenths, then held into the second bar.
  finaleRun: [[...run(0, [0, 2, 4, 6, 7, 9, 11, 13]), [8, 24, 14]], []],
} satisfies Record<string, Figure<number>>;

// The clavinet's figures, on the chord's voicing (4 and up: an octave
// up; two notes on a step sound together): a part picks one, by weight.
// Its notes ring on to the next hit, or near it.
export type ClavFigure = 'push' | 'chop' | 'gallop' | 'octaves' | 'held';
export const CLAV: Readonly<Record<ClavFigure, { weight: number; figure: Figure<number> }>> = {
  // A broken chord off the beat, never on one.
  push: {
    weight: 3,
    figure: [
      [
        [1, 2, 0],
        [3, 3, 2],
        [6, 3, 1],
        [9, 2, 0],
        [11, 2, 2],
        [13, 3, 3],
      ],
    ],
  },
  // Double stops on the offbeats.
  chop: {
    weight: 2,
    figure: [
      [
        [2, 2, 0],
        [2, 2, 2],
        [6, 3, 1],
        [6, 3, 3],
        [10, 2, 0],
        [10, 2, 2],
        [14, 2, 1],
        [14, 2, 3],
      ],
    ],
  },
  // Two bars, pushed across the bar line.
  gallop: {
    weight: 2,
    figure: [
      [
        [0, 2, 0],
        [3, 2, 2],
        [6, 4, 3],
        [10, 2, 1],
        [12, 3, 2],
      ],
      [
        [2, 2, 0],
        [4, 2, 1],
        [7, 3, 2],
        [11, 4, 3],
      ],
    ],
  },
  // The lowest note against its octave, a funk clav's bounce.
  octaves: {
    weight: 2,
    figure: [
      [
        [0, 3, 0],
        [3, 3, 4],
        [6, 2, 2],
        [8, 3, 0],
        [11, 2, 4],
        [13, 3, 3],
      ],
    ],
  },
  // Two double stops a bar, held.
  held: {
    weight: 1,
    figure: [
      [
        [2, 6, 1],
        [2, 6, 3],
        [10, 6, 0],
        [10, 6, 2],
      ],
    ],
  },
};

// The finale's two bars: the band's pushed hits, then a last stab.
export const FINALE_HITS: Rhythm = [RHYTHMS.stops[0], [[0, 4]]];
export const FINALE_DEGREES = [4, 9, 13, 15, 17, 19];

// The highest MIDI note a melody may be doubled up to.
export const DOUBLE_TOP = 100;

// How often a chorus's lead echoes, and how far behind (in bars of 4/4):
// a quarter-note triplet (J-Cycle's), or a dotted eighth.
export const ECHO = { chance: 0.35, delays: [1 / 6, 3 / 16] };

// How often an intro or a solo ends on the horns running up the scale into the next downbeat.
export const RUN_INTO = 0.12;

// How often the bells' ostinato plays under a theme's second half, and under a vamp.
export const OSTINATO_CHANCE = { theme: 0.5, vamp: 0.3 };

// A lead that scoops up into its long notes (a synth lead's or a sax's
// way): how often, from how long a note (in bars), how far below, and
// how fast.
export const SCOOP = { chance: 0.3, from: 3 / 16, semis: [1, 2], seconds: 0.09 };

// Seconds a slurred note takes to slide into its pitch.
export const SLIDE_SECONDS = 0.05;
