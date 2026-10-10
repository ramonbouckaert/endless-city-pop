// Fixed rhythms and figures the arrangement plays, as data: for each
// bar, its hits on a sixteenth-note grid, [step, length in steps], and
// for a figure a value on each: an index into a chord's voicing or a
// scale degree. engine/figures.ts places them in time.

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

// Figures on a chord's voicing (notes counted up from its lowest) or on a scale (degrees).
export const FIGURES = {
  // Up the chord's voicing in eighths, twice a bar.
  arp: [[0, 1, 2, 3, 0, 1, 2, 3].map((n, i) => [i * 2, 2, n] as const)],
  clav: [
    [
      [1, 1, 0],
      [3, 1, 2],
      [6, 1, 1],
      [9, 1, 0],
      [11, 1, 2],
      [13, 1, 3],
    ],
  ],
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
  // Up the chord in sixteenths, then held into the second bar.
  finaleRun: [[...run(0, [0, 2, 4, 6, 7, 9, 11, 13]), [8, 24, 14]], []],
} satisfies Record<string, Figure<number>>;

// The finale's two bars: the band's pushed hits, then a last stab.
export const FINALE_HITS: Rhythm = [RHYTHMS.stops[0], [[0, 4]]];
export const FINALE_DEGREES = [4, 9, 13, 15, 17, 19];

// The highest MIDI note a melody may be doubled up to.
export const DOUBLE_TOP = 100;

// Seconds a slurred note takes to slide into its pitch.
export const SLIDE_SECONDS = 0.05;
