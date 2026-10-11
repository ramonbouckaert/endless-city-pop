// Melody: each section's melody style (its rhythm cells per motif,
// range, and phrase forms or loop), phrase forms and shapes; the chorus
// answer's figures; and how solos run.

import type { Odds, Range, Weighted } from '../lib/random';

// How a pre-chorus melody unfolds: climbing a step each repeat, call and
// response, or long held notes.
export type PreMelody = 'climb' | 'question' | 'hold';
// A is the idea; C a half cadence, D the full one; E a contrast or tag; F
// a fragment; H a long held note; R a bar's rest.
export type MotifLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'H' | 'R';
// How a verse, chorus or bridge melody lays its motifs over eight bars,
// or a theme's over sixteen, in four-bar phrases.
export type PhraseForm = 'period' | 'pairs' | 'sentence' | 'aaba' | 'callResponse' | 'theme' | 'pairs4';
export type ShapeName = 'rise' | 'fall' | 'arch' | 'valley' | 'neighbor' | 'leapFall' | 'zigzag';

// A cell is eight eighth-note slots: x a note, - held, . a rest. (A
// melody is written out in sixteenths, like every line.)
export type Cells = Readonly<Partial<Record<MotifLetter, readonly string[]>>>;

// F, the fragment, only appears in phrase forms (verse, chorus, bridge):
// a short figure stated twice in the bar.
const CELLS = {
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
} satisfies Record<string, Cells>;

export interface PhraseFormDef {
  plan: readonly MotifLetter[];
  /** Rhythm cells used in place of the kind's own. */
  cells?: Cells;
  /** Degrees a motif sits above where it would otherwise start. */
  lift?: Partial<Record<MotifLetter, number>>;
  /** Degrees a motif moves on each repeat, in sequence. */
  step?: Partial<Record<MotifLetter, number>>;
}

// A held note: a bar of it, perhaps from the and of one, or with a pickup into the rest.
const HOLD_NOTES = ['x-------', '.x------', 'x-----x-'];

// Phrase forms, of eight bars or (theme, pairs4) sixteen. A is the idea;
// C a half cadence, D the full one.
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
  // Sixteen bars of four-bar phrases (J-Cycle's theme): two bars of line,
  // a held note, a bar's rest for an answer; the second phrase ends
  // open, and the last climbs into the cadence with no rest.
  theme: {
    plan: ['A', 'B', 'H', 'R', 'A', 'C', 'H', 'R', 'A', 'B', 'H', 'R', 'E', 'E', 'C', 'D'],
    lift: { E: 2 },
    cells: { H: HOLD_NOTES },
  },
  // Two-bar calls and answers, each phrase resting in its last bar.
  pairs4: {
    plan: ['A', 'B', 'C', 'R', 'A', 'B', 'H', 'R', 'A', 'B', 'C', 'R', 'F', 'F', 'C', 'D'],
    step: { F: 1 },
    cells: { H: HOLD_NOTES },
  },
};

const FORM_CHOICES = {
  chorus: { period: 4, pairs: 2, sentence: 2, aaba: 2, callResponse: 2 },
  verse: { period: 3, pairs: 2, sentence: 2, aaba: 1, callResponse: 3 },
  bridge: { period: 2, pairs: 1, sentence: 3, aaba: 2 },
  theme: { theme: 2, pairs4: 1 },
} satisfies Record<string, Odds<PhraseForm>>;

const MELODY_RANGES = {
  chorus: { center: 4, lo: -1, hi: 9 },
  verse: { center: 1, lo: -3, hi: 6 },
  pre: { center: 2, lo: -2, hi: 9 },
  bridge: { center: 3, lo: -2, hi: 8 },
  riff: { center: 6, lo: 2, hi: 10 },
} satisfies Record<string, MelodyStyle['range']>;

const HOLD_CELLS: Cells = {
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

/**
 * How a melody is written: its range (scale degrees above the tonic),
 * its rhythm cells, and either the phrase forms it picks from or the
 * loop it plays.
 */
export interface MelodyStyle {
  range: { center: number; lo: number; hi: number };
  cells: Cells;
  forms?: Odds<PhraseForm>;
  plan?: LoopPlan;
  /** Degrees a motif climbs with each repeat. */
  sequence?: number;
  /** Keeps to the key's notes, with no chromatic passing notes (a riff, harmonised by scale steps). */
  diatonic?: boolean;
}

// Each section's melody: verses, choruses and bridges in phrase forms; a
// riff's call and response, closing on a full cadence.
export const MELODIES = {
  verse: { range: MELODY_RANGES.verse, cells: CELLS.verse, forms: FORM_CHOICES.verse },
  chorus: { range: MELODY_RANGES.chorus, cells: CELLS.chorus, forms: FORM_CHOICES.chorus },
  bridge: { range: MELODY_RANGES.bridge, cells: CELLS.bridge, forms: FORM_CHOICES.bridge },
  riff: { range: MELODY_RANGES.riff, cells: CELLS.riff, plan: { loop: ['A', 'B'], end: ['D'] }, diatonic: true },
  // Sixteen bars in four-bar phrases: a theme song's chorus, or a long verse's.
  theme: { range: MELODY_RANGES.chorus, cells: CELLS.chorus, forms: FORM_CHOICES.theme },
} satisfies Record<string, MelodyStyle>;

// Pre-chorus melodies all end on a half cadence into the chorus. Some
// climb a step with every repeat of their motif (`sequence`).
export const PRE_MELODIES: Readonly<Record<PreMelody, MelodyStyle>> = {
  climb: { range: MELODY_RANGES.pre, sequence: 1, cells: CELLS.pre, plan: { loop: ['A'], end: ['B', 'C'] } },
  question: { range: MELODY_RANGES.pre, cells: CELLS.pre, plan: { loop: ['A', 'B'], end: ['C'] } },
  hold: { range: MELODY_RANGES.pre, sequence: 1, cells: HOLD_CELLS, plan: { loop: ['A'], end: ['C'] } },
};

export const SHAPE_CHOICES: Readonly<Record<MotifLetter, Odds<ShapeName>>> = {
  A: { rise: 3, arch: 3, leapFall: 2, zigzag: 2, valley: 1 },
  B: { fall: 3, valley: 2, neighbor: 2, arch: 2, rise: 1 },
  C: { fall: 2, neighbor: 2, valley: 2, arch: 1 },
  D: { fall: 2, valley: 2, neighbor: 2, arch: 1, leapFall: 1 },
  E: { rise: 2, arch: 2, leapFall: 1 },
  F: { zigzag: 2, neighbor: 2, fall: 2, rise: 1 },
  H: { neighbor: 1 }, // one note (or two)
  R: { neighbor: 1 }, // none
};

// The answer to a hook: short figures of [step, length] in sixteenths
// from where it starts, from a high degree, stepping between notes (a
// figure's steps all rise, `rise` of the time, or all fall); an echo takes up to `echo` notes
// of the hook's tail; a held line stays between degrees `line`.
export const ANSWER = {
  figures: [
    [
      [0, 2],
      [2, 4],
    ],
    [
      [0, 2],
      [2, 2],
    ],
    [
      [0, 2],
      [2, 2],
      [4, 2],
    ],
    [
      [0, 4],
      [4, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 4],
    ],
    [
      [0, 3],
      [3, 3],
      [6, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 2],
      [4, 2],
    ],
    [
      [1, 2],
      [3, 1],
      [4, 4],
    ],
  ] as readonly (readonly [step: number, len: number])[][],
  startDegrees: [7, 8, 9],
  rise: 0.65,
  rising: [2, 3, 4],
  falling: [-2, -3],
  echo: 3,
  line: [5, 11] as Range,
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
  // breath. They lean in the way the line is going (from below on the way
  // up, from above on the way down), mostly a semitone away.
  grace: {
    chance: 0.2,
    chromatic: 0.65,
    slur: 0.6,
  },
  // Now and then (from the second bar on) a bar is a move of its own
  // (J-Cycle's organ solo): a glissando in thirty-seconds up into a held
  // note; a cascade of sixteenths down; or stabs of a chord (on a
  // soloist that plays chords; any other plays their top notes).
  moves: {
    chance: 0.12,
    kinds: { gliss: 2, cascade: 2, stabs: 1 } as Odds<SoloMove>,
    gliss: 10, // notes up to the held one
    cascade: 12, // notes down
    stabs: 'x.x..x.x.x..x...',
    stack: [2, 4], // degrees under a stab's top note
  },
};
export type SoloMove = 'gliss' | 'cascade' | 'stabs';

// How often a song's chorus, coming back, trills its first long held
// note (a lone note held half a bar or more), if it has one.
export const TRILL = { chance: 0.3 };

// How often a melody approaches a note chromatically, from a semitone off, where it can.
export const CHROMATIC_PROB = 0.15;
// Where a full cadence's last note lands: the tonic, the fifth, or the chord tone it was on (-1).
// The tonic and fifth are only offered when the chord under the note has them.
export const CADENCE_WEIGHTS: Weighted<number> = [
  [0, 6],
  [7, 4],
  [-1, 8],
];
