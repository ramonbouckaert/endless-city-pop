// Melody: rhythm cells per motif, phrase forms, ranges and shapes; the
// chorus answer's figures; and how solos run.

import type { Odds, Weighted } from '../lib/random';

export type MelodyKind = 'verse' | 'pre' | 'chorus' | 'bridge' | 'riff';
// How a pre-chorus melody unfolds: climbing a step each repeat, call and
// response, or long held notes.
export type PreMelody = 'climb' | 'question' | 'hold';
// A is the idea; C a half cadence, D the full one; E a contrast or tag; F a fragment.
export type MotifLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
// How a verse, chorus or bridge melody lays its motifs over eight bars.
export type PhraseForm = 'period' | 'pairs' | 'sentence' | 'aaba' | 'callResponse';
export type ShapeName = 'rise' | 'fall' | 'arch' | 'valley' | 'neighbor' | 'leapFall' | 'zigzag';

// A cell is eight eighth-note slots: x a note, - held, . a rest.
export type Cells = Readonly<Partial<Record<MotifLetter, readonly string[]>>>;

// F, the fragment, only appears in phrase forms (verse, chorus, bridge):
// a short figure stated twice in the bar.
export const CELLS: Readonly<Record<MelodyKind, Cells>> = {
  chorus: {
    A: [
      '.xxxx---',
      '.x.xx---',
      'x-.xx---',
      '.xx-x---',
      '..xxx---',
      '.xxx.x--',
      'x.xxx---',
      '.x.x.xx-',
      'x--xxx--',
      '.xx-----',
      'x-----xx',
      '..xx----',
      'x---x---',
    ],
    B: [
      'x-.x.x--',
      'x.xxx.x.',
      '.x.xx.x.',
      'x-xx.x--',
      'xx.x.x--',
      '.xx.xx--',
      'x...xxx-',
      'x-----x-',
      '.x.x----',
      'x--x----',
    ],
    C: ['x---x---', 'x-x-x---', '.x.x----', 'x--x----', '.x--x---', 'x----x--'],
    D: ['x-------', '.xx-x---', 'xx-x----', '.x------', 'x---x---', '..x.x---', 'x-x.x---'],
    E: ['.xxxx---', '.x.xx---', 'x.x.xx--', '.xx-----', 'x---x---'],
    F: ['.xx..xx.', 'x.x-x.x-', 'xx-.xx-.', '.x.x.x.x', 'x--x--x-'],
  },
  verse: {
    A: [
      '.xx.x.x.',
      '..xx.xx-',
      '.x.xxx--',
      'x.x.xx--',
      '.xxxx-..',
      'x..xx.x.',
      '.x.x.xx-',
      'x.xxx...',
      '.x.x----',
      'xx------',
      '..xx----',
    ],
    B: ['.x.x.x--', 'x-.xx.x-', '..x.xxx-', '.xx.x---', 'x--.x.x-', 'x...xx.x', 'x-----x-', 'x--x----', '.xx-----'],
    C: ['x--.xx--', 'x-x-x---', '.x.x----', '.x--x---', 'x----x--'],
    D: ['x--x----', 'x-------', '.xx-x---', '.x------', 'x.x-----', '..x.x---', 'x---.x--'],
    E: ['.xx.x---', 'x-.x----', '.x.x----', 'x---x---'],
    F: ['.xx..xx.', 'x.x.x.x.', '.x.x.x.x', 'x--x--x-', 'xx..xx..'],
  },
  pre: {
    A: ['.x.xxx--', '.x.xx-x-', 'x.x.xx--', 'x.x.x.x-', '.xx.x.x-'],
    B: ['x---.x.x', 'x-.x.x--', '.x.x.x--', 'x.x-x---'],
    C: ['x-------', 'x---x---', '.x------', '.x--x---'],
    D: ['x---.xx-', 'x-------', '.x------', '..x.x---', 'x---x---'],
    E: ['x---x---', '.x--x---'],
  },
  bridge: {
    A: ['x-----xx', 'x-----.x', 'x---x---', 'x-----x-', 'x----x--', '.x---x--'],
    B: ['x---.xx-', 'x-x-x---', 'x--x-x--', 'x--x----', '.x--x---'],
    C: ['x-------', 'x---x---', '.x------', '.x--x---'],
    D: ['x-------', 'x-----x-', '.x------', 'x---x---', 'x..x----', '..x-----'],
    E: ['x---x---', 'x-------'],
    F: ['x--x--x-', 'x-x-x-x-', 'x---x-x-', '.x-.x-x-'],
  },
  riff: {
    A: ['x.xx.x.x', 'x..x.xx.', '.xx.xx.x', 'x.x..xx.', '.x.xx.xx', 'xx..x.xx'],
    B: ['.x.xx.x.', 'x.xx.x--', '.x.x.xx-', 'x.x.xx--', '.xx.x.x.'],
    C: ['x.x.x---', 'x..x.x--'],
    D: ['x.xx.x--', 'x..x----', 'x.x.x.--', '.x.xx---'],
    E: ['x.x.x---', 'x.x-----'],
  },
};

export interface PhraseFormDef {
  plan: readonly MotifLetter[];
  /** Rhythm cells used in place of the kind's own. */
  cells?: Cells;
  /** Degrees a motif sits above where it would otherwise start. */
  lift?: Partial<Record<MotifLetter, number>>;
  /** Degrees a motif moves on each repeat, in sequence. */
  step?: Partial<Record<MotifLetter, number>>;
}

// Eight-bar phrase forms. A is the idea; C a half cadence, D the full one.
export const PHRASE_FORMS: Readonly<Record<PhraseForm, PhraseFormDef>> = {
  // Antecedent and consequent: the same opening, ending open then closed.
  period: { plan: ['A', 'B', 'A', 'C', 'A', 'B', 'A', 'D'] },
  // The opening pair twice, then a late half cadence holds off the close.
  pairs: { plan: ['A', 'B', 'A', 'B', 'A', 'C', 'A', 'D'] },
  // An idea and its repeat, then fragments climbing in sequence, then a
  // broadening into the cadence.
  sentence: { plan: ['A', 'B', 'A', 'B', 'F', 'F', 'C', 'D'], step: { F: 1 } },
  // Two A pairs, a contrasting pair set higher, and the A back home.
  aaba: { plan: ['A', 'B', 'A', 'B', 'E', 'C', 'A', 'D'], lift: { E: 2 } },
  // Short calls that leave room, answered by busier lines.
  callResponse: {
    plan: ['A', 'B', 'A', 'B', 'A', 'B', 'A', 'D'],
    cells: {
      A: ['.xxx-...', 'x.xx-...', '.x.xx-..', 'xx.x-...', '..xxx-..'],
      B: ['x.x.xx--', '.xx.xxx-', 'x.xxx.x-', '.x.x.xx-', 'xx.xx---'],
    },
  },
};

export const FORM_CHOICES: Readonly<Partial<Record<MelodyKind, Odds<PhraseForm>>>> = {
  chorus: { period: 4, pairs: 2, sentence: 2, aaba: 2, callResponse: 2 },
  verse: { period: 3, pairs: 2, sentence: 2, aaba: 1, callResponse: 3 },
  bridge: { period: 2, pairs: 1, sentence: 3, aaba: 2 },
};

export const MELODY_RANGES: Readonly<Record<MelodyKind, { center: number; lo: number; hi: number }>> = {
  chorus: { center: 4, lo: -1, hi: 9 },
  verse: { center: 1, lo: -3, hi: 6 },
  pre: { center: 2, lo: -2, hi: 9 },
  bridge: { center: 3, lo: -2, hi: 8 },
  riff: { center: 6, lo: 2, hi: 10 },
};

export const HOLD_CELLS: Cells = {
  A: ['x-------', 'x-----x-', 'x---x---', '.x------'],
  B: ['x---x---', 'x-----.x'],
  C: ['x-------'],
  D: ['x-------'],
  E: ['x-------'],
};

// A melody without a phrase form loops its motifs into closing ones:
// its last bars play `end` (all but its first bar, if it is short), the
// bars before cycle through `loop`.
export interface LoopPlan {
  loop: readonly MotifLetter[];
  end: readonly MotifLetter[];
}

// Pre-chorus melodies all end on a half cadence into the chorus. Some
// climb a step with every repeat of their motif (`sequence`).
export const PRE_MELODIES: Readonly<Record<PreMelody, { sequence: number; cells: Cells; plan: LoopPlan }>> = {
  climb: { sequence: 1, cells: CELLS.pre, plan: { loop: ['A'], end: ['B', 'C'] } },
  question: { sequence: 0, cells: CELLS.pre, plan: { loop: ['A', 'B'], end: ['C'] } },
  hold: { sequence: 1, cells: HOLD_CELLS, plan: { loop: ['A'], end: ['C'] } },
};

// A riff's call and response, closing on a full cadence.
export const RIFF_PLAN: LoopPlan = { loop: ['A', 'B'], end: ['D'] };

export const SHAPE_CHOICES: Readonly<Record<MotifLetter, Odds<ShapeName>>> = {
  A: { rise: 3, arch: 3, leapFall: 2, zigzag: 2, valley: 1 },
  B: { fall: 3, valley: 2, neighbor: 2, arch: 2, rise: 1 },
  C: { fall: 2, neighbor: 2, valley: 2, arch: 1 },
  D: { fall: 2, valley: 2, neighbor: 2, arch: 1, leapFall: 1 },
  E: { rise: 2, arch: 2, leapFall: 1 },
  F: { zigzag: 2, neighbor: 2, fall: 2, rise: 1 },
};

export const ANSWER = {
  figures: [
    [
      [0, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [0, 2],
      [2, 1],
    ],
  ] as readonly (readonly [number, number])[][],
  startDegrees: [7, 8, 9],
  steps: [2, 3, -2],
};

export const SOLO = {
  rhythms: [
    '..x.xxxxx.x.x...',
    'x.x.x.xxx.x.....',
    '..xxxxx.x...x.x.',
    'x...x.x.xxxxx...',
    '.xx.x.xxx.x.xx..',
    'x.xxx.x.x.x.x...',
    '..x.x.x.xxxxx.x.',
    'xxxxx.x.....x.x.',
  ],
  lo: 6,
  hi: 18,
  turn: 0.2,
  leaps: [
    [1, 1],
    [2, 2],
    [3, 1],
  ] as Weighted<number>,
  // Grace notes flick into notes that stand out: on the beat, or after a
  // breath. Mostly a chromatic lean up from a semitone below.
  grace: {
    chance: 0.2,
    from: [
      [{ from: -1, chromatic: true }, 5],
      [{ from: 1, chromatic: false }, 2],
      [{ from: 1, chromatic: true }, 1],
      [{ from: -1, chromatic: false }, 1],
    ] as Weighted<{ from: 1 | -1; chromatic: boolean }>,
    slur: 0.6,
  },
};

// How often a step in a melody is taken chromatically.
export const CHROMATIC_PROB = 0.15;
// Where a full cadence's last note lands: the tonic, the fifth, or the chord tone it was on (-1).
export const CADENCE_WEIGHTS: Weighted<number> = [
  [0, 11],
  [7, 5],
  [-1, 4],
];
