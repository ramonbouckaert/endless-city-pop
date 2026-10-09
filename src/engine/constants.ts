// Every table and tunable the engine uses: music theory facts, the
// jazz-funk style, and the shapes of melodies, bass lines and drums.

import type {
  BassFeel,
  BassFeelDef,
  BassToken,
  ChordClass,
  ChordDef,
  DrumFeel,
  DrumRecipe,
  DrumPlan,
  DrumVoice,
  IntroTexture,
  MelodyKind,
  Mode,
  MotifLetter,
  PaletteName,
  PreFlavour,
  PreFlavourDef,
  PreMelody,
  Range,
  Tonality,
  Turnaround,
  SectionType,
  StepGains,
  Weighted,
} from './types';

// =====================================================================
// Theory
// =====================================================================

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Modes and chord-scales, named the way Strudel's scale() wants them.
export const MODES: Readonly<Record<string, readonly number[]>> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  'melodic:minor': [0, 2, 3, 5, 7, 9, 11],
  'harmonic:minor': [0, 2, 3, 5, 7, 8, 11],
  'lydian:dominant': [0, 2, 4, 6, 7, 9, 10],
  'phrygian:dominant': [0, 1, 4, 5, 7, 8, 10],
  altered: [0, 1, 3, 4, 6, 8, 10],
};

// Rotations of the major scale, in order.
export const CHURCH_MODES = ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'minor', 'locrian'];

// Major tonics spelled with flats (C counts as a flat key, so its
// chromatic chords read Bb and Eb rather than A# and D#). Other modes
// spell like their relative major.
export const FLAT_TONICS: ReadonlySet<number> = new Set([0, 5, 10, 3, 8, 1, 6]); // C F Bb Eb Ab Db Gb

// Spelling in a key: chromatic notes are flattened degrees, except the
// raised fourth. Index: semitones above the tonic -> letters above it.
export const DEGREE_OF_OFFSET = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const LETTER_PCS = [0, 2, 4, 5, 7, 9, 11];
export const RARE_SPELLINGS = ['Cb', 'Fb', 'E#', 'B#'];

// Chord symbols from Strudel's default (iReal) voicing dictionary.
export const CHORDS: Readonly<Record<string, ChordDef>> = {
  '': { cls: 'maj', tones: [0, 4, 7] },
  add9: { cls: 'maj', tones: [0, 4, 7, 14] },
  '^7': { cls: 'maj', tones: [0, 4, 7, 11] },
  '^9': { cls: 'maj', tones: [0, 4, 7, 11, 14] },
  69: { cls: 'maj', tones: [0, 4, 7, 9, 14] },
  '^7#11': { cls: 'maj', tones: [0, 4, 7, 11, 18] },
  '^9#11': { cls: 'maj', tones: [0, 4, 7, 11, 14, 18] },
  m: { cls: 'min', tones: [0, 3, 7] },
  m7: { cls: 'min', tones: [0, 3, 7, 10] },
  madd9: { cls: 'min', tones: [0, 3, 7, 14] },
  m6: { cls: 'min', tones: [0, 3, 7, 9] },
  m69: { cls: 'min', tones: [0, 3, 7, 9, 14] },
  'm^7': { cls: 'min', tones: [0, 3, 7, 11] },
  'm^9': { cls: 'min', tones: [0, 3, 7, 11, 14] },
  m9: { cls: 'min', tones: [0, 3, 7, 10, 14] },
  m11: { cls: 'min', tones: [0, 3, 7, 10, 14, 17] },
  7: { cls: 'dom', tones: [0, 4, 7, 10] },
  9: { cls: 'dom', tones: [0, 4, 7, 10, 14] },
  13: { cls: 'dom', tones: [0, 4, 7, 10, 14, 21] },
  '7sus': { cls: 'dom', tones: [0, 5, 7, 10] },
  '9sus': { cls: 'dom', tones: [0, 5, 7, 10, 14] },
  '7b9sus': { cls: 'dom', tones: [0, 5, 7, 10, 13] }, // the phrygian chord
  '7b9': { cls: 'dom', tones: [0, 4, 7, 10, 13] },
  '13b9': { cls: 'dom', tones: [0, 4, 7, 10, 13, 21] },
  '7#9': { cls: 'dom', tones: [0, 4, 7, 10, 15] },
  '7alt': { cls: 'dom', tones: [0, 4, 10, 13, 15, 20] },
  '13#11': { cls: 'dom', tones: [0, 4, 7, 10, 18, 21] },
  m7b5: { cls: 'hdim', tones: [0, 3, 6, 10] },
  o7: { cls: 'dim', tones: [0, 3, 6, 9] },
  sus: { cls: 'sus', tones: [0, 5, 7] },
  5: { cls: 'power', tones: [0, 7] },
};

// The chord-scale a symbol implies regardless of context.
export const SYMBOL_SCALES: Readonly<Record<string, string>> = {
  '^7#11': 'lydian',
  '^9#11': 'lydian',
  '7b9': 'phrygian:dominant',
  '13b9': 'phrygian:dominant',
  '7alt': 'altered',
  '13#11': 'lydian:dominant',
  m7b5: 'locrian',
  o7: 'locrian',
  m6: 'dorian',
  m69: 'dorian',
  'm^7': 'melodic:minor', // the jazz minor tonic
  'm^9': 'melodic:minor',
  '7sus': 'mixolydian',
  '9sus': 'mixolydian',
  '7b9sus': 'phrygian',
  sus: 'mixolydian',
  '7#9': 'mixolydian',
};

// A chromatic chord's usual chord-scale, by family. A dominant
// resolving to a minor chord takes DOM_TO_MINOR_SCALE instead.
export const FAMILY_SCALES: Readonly<Record<ChordClass, string>> = {
  maj: 'lydian',
  min: 'dorian',
  dom: 'mixolydian',
  hdim: 'locrian',
  dim: 'locrian',
  sus: 'mixolydian',
  power: 'mixolydian',
};
export const DOM_TO_MINOR_SCALE = 'phrygian:dominant';

export const NUMERALS: Readonly<Record<string, number>> = { i: 0, ii: 2, iii: 4, iv: 5, v: 7, vi: 9, vii: 11 };

// =====================================================================
// Harmony
// =====================================================================

// Colours for each chord family; majLydian is a major chord away from
// the tonic, domToMinor a dominant resolving to a minor chord (or a
// minor key's V), susToMinor a minor key's sus V.
export const PALETTE: Readonly<Record<PaletteName, Weighted<string>>> = {
  maj: [
    ['^9', 3],
    ['^7', 1],
    ['69', 1],
  ],
  majLydian: [
    ['^9#11', 2],
    ['^7#11', 2],
    ['^9', 1],
  ],
  min: [
    ['m9', 3],
    ['m11', 2],
    ['m7', 1],
  ],
  dom: [
    ['13', 3],
    ['9', 2],
    ['9sus', 1],
  ],
  domToMinor: [
    ['7alt', 3],
    ['7b9', 1],
    ['13b9', 1],
  ],
  // A minor key's suspended V: phrygian, or the plain 9sus.
  susToMinor: [
    ['7b9sus', 2],
    ['9sus', 1],
  ],
  hdim: [['m7b5', 1]],
  dim: [['o7', 1]],
  sus: [
    ['9sus', 2],
    ['13', 1],
  ],
  power: [['9sus', 1]],
  // A minor key's tonic: aeolian m9, dorian m6/9, or the melodic-minor
  // m(maj9) of a jazz minor ending.
  minTonic: [
    ['m9', 3],
    ['m69', 2],
    ['m^9', 1],
    ['m11', 1],
  ],
  // A mixolydian key's tonic: a dominant that doesn't resolve, sometimes
  // the funk #9.
  domTonic: [
    ['13', 3],
    ['9', 2],
    ['7#9', 1],
  ],
};

// Substitution odds (times the style's reharm amount) and colours.
export const REHARM = {
  tritone: 0.3, // V7 -> bII13#11
  relatedII: 0.4, // V7 -> ii V7
  secondary: 0.35, // a dominant into the next chord
  secondaryTritone: 0.3, // ... as its tritone sub
  iiSymbols: ['m9', 'm7', 'm11'],
  toMinor: ['7alt', '7b9'],
  toMajor: ['13', '9', '7#9'],
};

// Solo changes: ii-V pairs in keys `step` semitones apart, then home.
export const SOLO_CHANGES = {
  steps: [
    [3, 3], // up a minor third
    [-2, 2], // down a whole step
    [5, 1], // up a fourth (round the circle of fifths)
    [-1, 1], // down a half step
  ] as Weighted<number>,
  starts: [0, 2, 9],
  ii: ['m9', 'm11', 'm7'],
  V: ['13', '9', '13'],
};

// Turnarounds into a lifted major key, relative to that key. Each
// tonality has its own (TONALITIES); these are the major key's.
export const LIFT_TURNAROUNDS: Readonly<Record<string, Turnaround>> = {
  'bVI-V': { weight: 2, bars: [['bVI:^7#11|^9#11'], ['V:7alt|13b9']] },
  'ii-V': { weight: 3, bars: [['ii:m9|m11'], ['V:7alt|13']] },
  tritone: { weight: 2, bars: [['ii:m9|m11'], ['bII:13#11']] },
  backdoor: { weight: 2, bars: [['iv:m9|m7'], ['bVII:13|9']] },
  'V of V': { weight: 2, bars: [['II:9|13'], ['V:7alt|13b9']] },
  turnaround: {
    weight: 2,
    bars: [
      ['iii:m7', 'VI:7alt'],
      ['ii:m9', 'V:13|7alt'],
    ],
  },
  // The ii-V a half step up, slipping down into the real one.
  'side-slip': {
    weight: 1,
    bars: [
      ['#ii:m9', '#V:13'],
      ['ii:m9', 'V:7alt'],
    ],
  },
  'sus pedal': { weight: 2, bars: [['V:9sus'], ['V:7alt|13b9']] },
  'truck driver': { weight: 1, bars: [['V:7alt|13']] },
  'long way': { weight: 1, bars: [['iii:m7|m9'], ['VI:7alt|13b9'], ['ii:m9|m11'], ['V:7alt|13']] },
  // Coltrane changes: major thirds round to the new tonic.
  coltrane: {
    weight: 1,
    bars: [
      ['ii:m7', 'bIII:7'],
      ['bVI:^7', 'VII:7'],
      ['III:^7', 'V:7'],
    ],
  },
};

// The intro's planing add9 chords start on bIII or bVI.
export const PLANING_STARTS = [3, 8];

// =====================================================================
// Form
// =====================================================================

export const FORM = {
  preBars: [0, 2, 4, 4, 6, 8], // 0: no pre-chorus
  chorusTag: 0.6, // chance of a two-bar tag (10 bars, not 8)
  rounds: [
    [1, 2],
    [2, 5],
    [3, 2],
  ] as Weighted<number>,
  riffChance: [0, 0.4, 0.7],
  introBars: [4, 4, 8],
  vamp: { chance: 0.6, bars: [4, 8] },
  verseBars: [8, 8, 16],
  bridgeChance: 0.65,
  soloists: [0, 1, 2, 3],
  soloCount: [
    [0, 1],
    [1, 4],
    [2, 3],
  ] as Weighted<number>,
  soloBars: [8, 8, 16],
  breakdown: { chance: 0.45, bars: [4, 8] },
  drumBreakChance: 0.55,
  // Lifts before the final choruses: always up, each by a step from
  // `steps`, never past `maxShift` semitones above home.
  lift: {
    first: 5 / 7, // chance the first final chorus lifts
    again: 0.4, // chance each later one lifts again
    steps: [
      [1, 2],
      [2, 3],
      [3, 1],
    ] as Weighted<number>,
    maxShift: 4,
  },
  finalChoruses: [
    [1, 2],
    [2, 4],
    [3, 1],
  ] as Weighted<number>,
  outroChance: 0.75,
};

// =====================================================================
// Melody
// =====================================================================

// Rhythm cells on an eighth-note grid: x is a note, - holds it, and . is a rest.
export const CELLS: Readonly<Record<MelodyKind, Readonly<Record<MotifLetter, readonly string[]>>>> = {
  chorus: {
    A: ['.xxxx---', '.x.xx---', 'x-.xx---', '.xx-x---', '..xxx---', '.xxx.x--'],
    B: ['x-.x.x--', 'x.xxx.x.', '.x.xx.x.', 'x-xx.x--', 'xx.x.x--'],
    C: ['x---x---', 'x-x-x---', '.x.x----', 'x--x----'],
    D: ['x-------', '.xx-x---', 'xx-x----'],
    E: ['.xxxx---', '.x.xx---'],
  },
  verse: {
    A: ['.xx.x.x.', '..xx.xx-', '.x.xxx--', 'x.x.xx--', '.xxxx-..'],
    B: ['.x.x.x--', 'x-.xx.x-', '..x.xxx-', '.xx.x---'],
    C: ['x--.xx--', 'x-x-x---', '.x.x----'],
    D: ['x--x----', 'x-------', '.xx-x---'],
    E: ['.xx.x---'],
  },
  pre: {
    A: ['.x.xxx--', '.x.xx-x-', 'x.x.xx--'],
    B: ['x---.x.x', 'x-.x.x--'],
    C: ['x-------', 'x---x---'],
    D: ['x---.xx-', 'x-------'],
    E: ['x---x---'],
  },
  bridge: {
    A: ['x-----xx', 'x-----.x', 'x---x---', 'x-----x-'],
    B: ['x---.xx-', 'x-x-x---', 'x--x-x--'],
    C: ['x-------', 'x---x---'],
    D: ['x-------', 'x-----x-'],
    E: ['x---x---'],
  },
  riff: {
    A: ['x.xx.x.x', 'x..x.xx.', '.xx.xx.x', 'x.x..xx.'],
    B: ['.x.xx.x.', 'x.xx.x--', '.x.x.xx-'],
    C: ['x.x.x---'],
    D: ['x.xx.x--'],
    E: ['x.x.x---'],
  },
};

// The motif plan of an eight-bar phrase: C is a half cadence, D a full
// cadence, E a tag figure.
export const PHRASE: readonly MotifLetter[] = ['A', 'B', 'A', 'C', 'A', 'B', 'A', 'D'];

// Centre and range in key-scale degrees above the tonic.
export const MELODY_RANGES: Readonly<Record<MelodyKind, { center: number; lo: number; hi: number }>> = {
  chorus: { center: 4, lo: -1, hi: 9 },
  verse: { center: 1, lo: -3, hi: 6 },
  pre: { center: 2, lo: -2, hi: 9 },
  bridge: { center: 3, lo: -2, hi: 8 },
  riff: { center: 6, lo: 2, hi: 10 },
};

// Pre-chorus melodies: how far a repeated motif climbs (in scale
// degrees) and the rhythm cells it draws on.
const HOLD_CELLS: Readonly<Record<MotifLetter, readonly string[]>> = {
  A: ['x-------', 'x-----x-', 'x---x---', '.x------'],
  B: ['x---x---', 'x-----.x'],
  C: ['x-------'],
  D: ['x-------'],
  E: ['x-------'],
};
export const PRE_MELODIES: Readonly<
  Record<PreMelody, { sequence: number; cells: Readonly<Record<MotifLetter, readonly string[]>> }>
> = {
  climb: { sequence: 1, cells: CELLS.pre },
  question: { sequence: 0, cells: CELLS.pre },
  hold: { sequence: 1, cells: HOLD_CELLS },
};

export type ShapeName = 'rise' | 'fall' | 'arch' | 'valley' | 'neighbor' | 'leapFall' | 'zigzag';
export const SHAPE_CHOICES: Readonly<Record<MotifLetter, Weighted<ShapeName>>> = {
  A: [
    ['rise', 4],
    ['arch', 3],
    ['leapFall', 2],
    ['zigzag', 1],
  ],
  B: [
    ['fall', 3],
    ['valley', 2],
    ['neighbor', 1],
    ['arch', 1],
  ],
  C: [
    ['fall', 2],
    ['neighbor', 1],
    ['valley', 1],
  ],
  D: [
    ['fall', 3],
    ['valley', 1],
  ],
  E: [
    ['rise', 2],
    ['arch', 1],
  ],
};

// Answering figures: [offset, length] in eighths after the gap opens.
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

// Solos: rhythms on a sixteenth grid, in chord-scale degrees from lo to hi.
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
  turn: 0.2, // chance of changing direction on each note
  leaps: [1, 2, 2, 3],
};

// =====================================================================
// Bass
// =====================================================================

export const BASS_FEELS: Readonly<Record<BassFeel, BassFeelDef>> = {
  pedal: { grid: 8, density: [0.05, 0.25], sync: [0, 0.3], octave: [0, 0.3], legato: [0.7, 1], approach: 0.6 },
  funk: { grid: 16, density: [0.35, 0.65], sync: [0.4, 0.9], octave: [0.3, 0.8], legato: [0.1, 0.5], approach: 0.9 },
  drive: { grid: 8, density: [0.75, 1], sync: [0, 0.2], octave: [0.1, 0.4], legato: [0.5, 0.9], approach: 0.8 },
  disco: { grid: 8, density: [0.6, 1], sync: [0.1, 0.4], octave: [0.6, 1], legato: [0.2, 0.6], approach: 0.8 },
  halfTime: { grid: 16, density: [0.1, 0.3], sync: [0.3, 0.7], octave: [0.1, 0.4], legato: [0.6, 1], approach: 0.7 },
  bossa: {
    grid: 8,
    density: [0.1, 0.3],
    sync: [0.1, 0.3],
    octave: [0, 0.2],
    legato: [0.6, 0.9],
    approach: 0.7,
    anchors: { 6: 'F', 8: 'F' },
  },
};

// Chord-scale degrees: root, third, fifth, seventh, octave, and the
// steps between them.
export const BASS_DEGREES: Readonly<Record<BassToken, string>> = {
  R: '0',
  T: '2',
  F: '4',
  S: '6',
  O: '7',
  two: '1',
  four: '3',
  six: '5',
  below: '-1',
};

// Note weights: [token, base, octave factor]; weight = base + factor * the
// feel's octave setting.
type NoteWeights = readonly (readonly [BassToken, number, number])[];
export const BASS_NOTES: { onBeat: NoteWeights; offBeat: NoteWeights } = {
  onBeat: [
    ['R', 3, 0],
    ['F', 2, 0],
    ['O', 1, 3],
    ['T', 1, 0],
    ['S', 0.5, 0],
  ],
  offBeat: [
    ['O', 0.5, 4],
    ['R', 1.5, 0],
    ['F', 1, 0],
    ['S', 1, 0],
    ['T', 0.7, 0],
    ['two', 0.4, 0],
    ['four', 0.4, 0],
    ['six', 0.3, 0],
    ['below', 0.3, 0],
  ],
};

export const BASS = {
  low: 28, // E1: roots sit from here to Eb2, and nothing goes below
  variety: [0.05, 0.3] as Range, // share of steps re-rolled per bar
  densityBoost: 1.3,
  fill: { density: 0.35, sync: 0.3 }, // added for a phrase's last bar
  // Approach notes, in semitones: around a repeated root, chromatic
  // into the next root, or diatonic into it.
  approachSame: [7, 10, -2],
  approachChromatic: [-1, 1, -1],
  approachDiatonic: [-2, 2, 7, -5],
};

// =====================================================================
// Drums
// =====================================================================

// The default sample kit, or a drum machine with every sound used here.
export const KITS: Weighted<string | null> = [
  [null, 4],
  ['LinnDrum', 1],
  ['LinnLM2', 1],
  ['RolandTR626', 1],
  ['RolandR8', 1],
  ['RolandMT32', 1],
  ['BossDR550', 1],
  ['AkaiXR10', 1],
  ['YamahaRY30', 1],
];

export const empty = (): StepGains => Array(16).fill(0);
export const at = (hits: Record<number, number>): StepGains => {
  const bar = empty();
  for (const [i, v] of Object.entries(hits)) bar[Number(i)] = v;
  return bar;
};
const steps = (list: readonly number[], gain: number | ((i: number) => number)) =>
  at(Object.fromEntries(list.map((i) => [i, typeof gain === 'number' ? gain : gain(i)])));

const BEATS = [0, 4, 8, 12];
export const EIGHTH_OFFS = [2, 6, 10, 14];

// Extra percussion: shaker, tambourine or cowbell.
const shaker: DrumVoice = { sound: 'sh', role: 'perc', bars: [empty().map((_, i) => (i % 2 ? 0.06 : 0.1))] };
const PERCUSSION: readonly DrumVoice[] = [
  shaker,
  shaker,
  { sound: 'tb', role: 'perc', bars: [at({ 4: 0.12, 12: 0.12 }), at({ 2: 0.1, 6: 0.1, 10: 0.1, 14: 0.1 })] },
  { sound: 'cb', role: 'perc', bars: [BEATS, [0, 6, 10], [2, 8, 14]].map((list) => steps(list, 0.08)) },
];
const percussion = (chance: number) => ({ op: 'voice', chance, voices: PERCUSSION }) as const;

// The backbeat's sound(s), and how the level scales for each.
export const BACKBEATS: Weighted<string[]> = [
  [['sd'], 4],
  [['sd', 'cp'], 2],
  [['cp'], 1],
  [['rim'], 0.5],
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
      { op: 'voice', chance: 0.5, voices: [{ sound: 'rim', role: 'perc', bars: [at({ 4: 0.08, 12: 0.08 })] }] },
      { op: 'cymbal', sixteenths: 0.3, ride: 0.35, loud: 0.7 },
      percussion(0.25),
    ],
  },
  bossa: {
    quiet: true,
    steps: [
      {
        op: 'voice',
        voices: [
          {
            sound: 'bd',
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
            sound: 'rim',
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
        voices: [{ sound: 'sh', role: 'perc', bars: [empty().map((_, i) => (i % 2 ? 0 : i % 4 ? 0.06 : 0.1))] }],
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
        voices: [{ sound: 'rim', role: 'snare', bars: [at({ 12: 0.1 }), at({ 4: 0.08, 12: 0.1 })] }],
      },
      { op: 'voice', chance: 0.4, voices: [{ sound: 'bd', role: 'kick', bars: [at({ 0: 0.35 })] }] },
    ],
  },
  claps: {
    steps: [
      { op: 'kicks', required: BEATS, optional: [], gain: 0.55 },
      { op: 'voice', voices: [{ sound: 'cp', role: 'snare', bars: [at({ 4: 0.45, 12: 0.45 })] }] },
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
            sound: 'sd',
            role: 'snare',
            bars: [2, 4].map((every) => empty().map((_, i) => (i % every ? 0 : 0.18 + (i / 16) * 0.2))),
          },
        ],
      },
      { op: 'cymbal', sixteenths: 0.3, ride: 0, loud: 0.6 },
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
  kickSoft: [0.7, 0.95] as Range, // optional kicks' level, times the gain
  ghostGain: [0.05, 0.1] as Range,
  cymbal: { accent: [0.14, 0.24] as Range, mid: [0.4, 0.7] as Range, weak: [0.2, 0.45] as Range, offbeat: 0.25 },
  rideLevel: 0.7,
  // Bar four of each phrase: a kick dropped and one added.
  vary: { chance: 0.7, drop: 0.5, steps: [3, 7, 10, 11, 14, 15], gains: [0.5, 0.6, 0.7] },
  openOnFour: { chance: 0.6, gain: 0.14 },
  openHatGain: 0.13,
};

// Fills: [value, weight, weight in a quiet feel].
export const FILLS = {
  count: 3,
  starts: [
    [12, 3, 3],
    [8, 4, 4],
    [0, 1, 0],
  ] as readonly (readonly [number, number, number])[],
  kinds: [
    ['roll', 3, 3],
    ['toms', 3, 1],
    ['mixed', 2, 0.5],
    ['unison', 1, 1],
    ['stop', 1, 0.3],
  ] as readonly (readonly [string, number, number])[],
  mixed: [
    ['sd', 3],
    ['ht', 1],
    ['mt', 1],
    ['lt', 1],
    ['bd', 1],
  ] as Weighted<string>,
  sixteenths: 0.65, // else eighths
  quietLevel: 0.6,
};

// =====================================================================
// Style: jazz-funk
// =====================================================================

export const STYLE = {
  reharm: 0.5,
  adventurous: 0.8,
  tempo: [100, 116] as Range,
  swing: [0.06, 0.12] as Range,
  approachChromatic: 0.75,
  // How an intro gets its harmony: the chorus's first four bars (with
  // the hook as a teaser), planing add9 chords, or an intro template.
  introHarmony: [
    ['chorus', 3],
    ['planing', 2],
    ['template', 6],
  ] as Weighted<'chorus' | 'planing' | 'template'>,
  introMelodyChance: 0.5,
  // Drums per section: the feels it may take, and how likely it starts
  // with a crash and ends with a fill.
  drums: {
    vamp: { feels: ['funk'], crash: 0, fill: 1 },
    verse: { feels: ['funk', 'funk', 'halfTime', 'disco'], crash: 0.3, fill: 0.7 },
    chorus: { feels: ['disco', 'disco', 'funk'], crash: 1, fill: 0.9 },
    bridge: { feels: ['halfTime', 'halfTime', 'bossa', 'introRide'], crash: 0.3, fill: 0.5 },
    solo: { feels: ['funk', 'disco'], crash: 1, fill: 0.9 },
    solo2: { feels: ['bossa', 'bossa', 'halfTime'], crash: 0.7, fill: 0.8 },
    riff: { feels: ['funk', 'disco'], crash: 1, fill: 1 },
    breakdown: { feels: ['claps', 'halfTime'], crash: 0, fill: 1 },
    lift: { feels: ['build'], crash: 1, fill: 0 },
    outro: { feels: ['introRide', 'halfTime'], crash: 1, fill: 0 },
    drumBreak: { feels: ['break'], crash: 0, fill: 1 },
  } as Partial<Record<SectionType, DrumPlan>>,
  // Bass feels that sit with a quieter drum feel.
  bassWith: {
    bossa: ['bossa', 'halfTime', 'pedal'],
    halfTime: ['halfTime', 'pedal', 'funk', 'bossa'],
    introRide: ['pedal', 'halfTime', 'funk'],
  } as Partial<Record<DrumFeel, BassFeel[]>>,
  // Intro arrangements, with the bass feels each may take and their drums.
  introTextures: {
    pads: { bass: ['pedal', 'halfTime'], drums: { feels: ['introRide'], crash: 0, fill: 0 } }, // soft keys and strings
    keys: { bass: ['pedal', 'halfTime'], drums: { feels: ['introRide'], crash: 0, fill: 0 } }, // Rhodes; the rest halfway
    groove: { bass: ['funk', 'funk', 'disco'], drums: { feels: ['funk', 'disco'], crash: 0, fill: 1 } }, // the band playing
    bassFirst: { bass: ['funk', 'halfTime'], drums: { feels: ['introRide', 'halfTime'], crash: 0, fill: 1 } }, // keys halfway
  } as Record<IntroTexture, { bass: BassFeel[]; drums: DrumPlan }>,
  // Bass feels each section may take.
  bassFeels: {
    vamp: ['funk', 'funk', 'disco'],
    verse: ['funk', 'funk', 'drive', 'halfTime'],
    chorus: ['disco', 'disco', 'funk', 'drive'],
    bridge: ['halfTime', 'halfTime', 'pedal', 'bossa'],
    solo: ['funk', 'drive', 'disco'],
    solo2: ['bossa', 'bossa', 'halfTime'],
    riff: ['funk', 'disco'],
    breakdown: ['disco', 'halfTime', 'pedal'],
    lift: ['disco', 'drive'],
    outro: ['pedal'],
  } as Partial<Record<SectionType, BassFeel[]>>,
  comp: { main: '~ [~ x] ~ [~ ~ x ~]', chorus: '[~ x]*4', bossa: '[x ~ ~ x] [~ ~ x ~] [~ x ~ ~] [x ~ ~ ~]' },
  sounds: {
    keys: 'gm_epiano1',
    guitar: 'gm_electric_guitar_muted',
    pads: ['gm_voice_oohs', 'gm_string_ensemble_1', 'gm_choir_aahs'],
    lead: ['gm_alto_sax', 0.5],
    double: ['gm_flute', 0.13],
    answer: ['gm_trumpet', 0.3],
    bell: ['gm_vibraphone', 0.3],
    soloists: [
      ['gm_overdriven_guitar', 0.34],
      ['gm_vibraphone', 0.42],
      ['gm_tenor_sax', 0.45],
      ['gm_trumpet', 0.36],
    ],
    horns: ['gm_brass_section', 'gm_alto_sax'],
    bass: 'gm_electric_bass_finger',
  } as {
    keys: string;
    guitar: string;
    pads: [string, string, string];
    lead: Voice;
    double: Voice;
    answer: Voice;
    bell: Voice;
    soloists: Voice[];
    horns: [string, string];
    bass: string;
  },
  // Highest playable MIDI note for soundfonts whose top samples are
  // broken (the vibraphone's C6-and-up zone won't decode).
  soundTops: { gm_vibraphone: 83 } as Record<string, number>,
};
type Voice = [sound: string, gain: number];

// =====================================================================
// Pre-chorus flavours
// =====================================================================

// Each song's pre-chorus takes one flavour: its progressions (fitted to
// end on their cadence into the chorus), melody, drums and bass. The
// arranger gives each its own texture.
export const PRE_FLAVOURS: Readonly<Record<PreFlavour, PreFlavourDef>> = {
  // A stepwise rise to the dominant, the band opening up.
  climb: {
    weight: 3,
    melody: 'climb',
    drums: { feels: ['build', 'funk', 'disco'], crash: 0.2, fill: 1 },
    bass: ['drive', 'funk', 'disco'],
  },
  // Suspense over a held dominant (or IV over it): long notes, strings swelling.
  pedal: {
    weight: 2,
    melody: 'hold',
    drums: { feels: ['halfTime', 'introRide'], crash: 0, fill: 1 },
    bass: ['pedal', 'halfTime'],
  },
  // The drums drop out and come back halfway.
  drop: {
    weight: 2,
    melody: 'question',
    drums: { feels: ['funk', 'disco'], crash: 0, fill: 1 },
    bass: ['halfTime', 'pedal', 'funk'],
  },
  // Stop-time: the band hits together under a free lead, all in for the last bar.
  stops: {
    weight: 2,
    melody: 'question',
    drums: { feels: ['funk', 'disco'], crash: 0.5, fill: 1 },
    bass: ['drive', 'disco'],
  },
  // Darker colour borrowed from the minor key: iv, bIII, bVI, bVII.
  borrowed: {
    weight: 2,
    melody: 'climb',
    drums: { feels: ['halfTime', 'build'], crash: 0.3, fill: 1 },
    bass: ['halfTime', 'drive'],
  },
};

// =====================================================================
// Tonalities: the modes a song can be in
// =====================================================================

// Each mode's progressions, as roman numerals relative to its tonic, one
// token per bar; "[ii7 V7]" puts two chords in a bar. A template's
// length is its natural phrase; it is repeated to fill the section.
// Chord-scales follow from the key: a diatonic chord takes its mode in
// the key (so iv in a minor key plays dorian, bVI lydian), a chromatic
// one its family's usual scale.
export const TONALITIES: Readonly<Record<Mode, Tonality>> = {
  // Jazz-funk in a major key: ii-V-I, secondary dominants, borrowed iv.
  major: {
    weight: 3,
    tonics: [5, 10, 3, 0, 7, 2],
    tonic: 'maj',
    reharm: 1,
    finale: [['^9', 'lydian']],
    approach: [['ii:m9|m11'], ['V:13|7alt|9sus']],
    templates: {
      vamp: ['ii7 V7', 'ii7 [ii7 V7]', 'vi7 II7'],
      verse: [
        'vi7 II7 vi7 II7 IVmaj7 [iii7 bIII7] ii7 V7',
        'ii7 V7 iii7 VI7 ii7 V7 Imaj7 Imaj7',
        'Imaj7 vi7 ii7 V7 iii7 VI7 ii7 V7',
        'IVmaj7 iii7 ii7 Imaj7 IVmaj7 iii7 ii7 V7sus',
        'vi7 vi7 II7 II7 IVmaj7 iii7 ii7 V7',
      ],
      chorus: [
        'IVmaj7 III7 vi7 [v7 I7] IVmaj7 III7 [vi7 II7] [ii7 V7]',
        'Imaj7 VI7 ii7 V7 iii7 VI7 ii7 V7',
        'IVmaj7 V7 iii7 vi7 ii7 V7 Imaj7 [ii7 V7]',
        'vi7 ii7 V7 Imaj7 IVmaj7 ii7 V7sus V7',
      ],
      tag: ['bVImaj7 V7sus', 'bVImaj7 bVII7'],
      bridge: ['IVmaj7 bVIImaj7 ii7 V7 Imaj7 IVmaj7', 'ii7 V7 Imaj7 vi7 ii7 V7', 'Imaj7 vi7 IVmaj7 V7 iii7 vi7'],
      riff: ['ii7 V7', 'vi7 II7'],
      // Intros besides the chorus tease and the planing add9 chords.
      intro: [
        'Imaj7 IVmaj7', // tonic vamp
        'ii7 V7', // ii-V vamp
        'Imaj7 bVIImaj7', // I to bVII, a funk staple
        'Imaj7 vi7 ii7 V7', // turnaround
        'iii7 VI7 ii7 V7', // turnaround from iii
        'V7sus V7sus V7sus V7', // dominant pedal
        'bVImaj7 bVII7 Imaj7 [ii7 V7]', // rising backdoor
        'IVmaj7 iii7 ii7 V7sus', // falling to the dominant
      ],
    },
    pre: {
      climb: [
        'ii7 iii7 IVmaj7 V7sus',
        'ii7 iii7 iv7 #iv° V7sus V7',
        'IVmaj7 #iv° V7sus V7',
        'ii7 [iii7 IVmaj7] V7sus V7',
      ],
      pedal: ['V7sus V7sus V7sus V7', 'IVmaj7 IVmaj7 V7sus V7sus', 'ii7 ii7 V7sus V7sus', 'V7sus V7'],
      drop: ['IVmaj7 iii7 ii7 V7sus', 'vi7 IVmaj7 ii7 V7sus', 'IVmaj7 V7 iii7 vi7 ii7 V7sus'],
      stops: ['IVmaj7 V7 iii7 vi7', 'IVmaj7 V7 [iii7 VI7] [ii7 V7sus]', 'ii7 V7 iii7 VI7 ii7 V7sus'],
      // Darker colour borrowed from the minor key: iv, bIII, bVI, bVII.
      borrowed: [
        'IVmaj7 iv7 iii7 VI7 ii7 V7sus',
        'bVImaj7 bVII7 IVmaj7 V7sus',
        'IVmaj7 iv7 iii7 bIIImaj7 ii7 V7sus',
        'ii7 bIIImaj7 IVmaj7 bVImaj7 bVII7 V7sus',
      ],
    },
    bridgeKeys: [
      { offset: 5, weight: 3, adventurous: false }, // IV: one step round the circle
      { offset: 7, weight: 2, adventurous: false }, // V
      { offset: 3, weight: 3, adventurous: true }, // bIII: chromatic mediant
      { offset: 8, weight: 3, adventurous: true }, // bVI
      { offset: 2, weight: 1, adventurous: true },
    ],
    turnarounds: LIFT_TURNAROUNDS,
  },

  // Jazz minor (Autumn Leaves, Blue Bossa, Summertime): the minor ii-V-i
  // of a half-diminished ii and an altered or b9 dominant, the aeolian
  // cycle iv-bVII-bIII-bVI, the Andalusian fall i-bVII-bVI-V, and the
  // dorian IV7 of minor funk. The tonic is a m9, m6/9 or m(maj9).
  minor: {
    weight: 3,
    tonics: [2, 7, 0, 5, 9, 4], // D G C F A E
    tonic: 'min',
    tonicPalette: 'minTonic',
    reharm: 0.9,
    finale: [
      ['m69', 'dorian'],
      ['m^9', 'melodic:minor'],
    ],
    approach: [['ii:m7b5'], ['V:7alt|7b9|13b9']],
    templates: {
      vamp: ['i7 IV7', 'iiø V7', 'i7 bVII7', 'i7 [iv7 bVII7]'],
      verse: [
        'i7 i7 iv7 iv7 iiø V7 i7 V7', // minor blues-ish
        'i7 iv7 bVII7 bIIImaj7 bVImaj7 iiø V7 i7', // round the aeolian cycle
        'i7 IV7 i7 IV7 bVImaj7 bVII7 iiø V7', // dorian funk, then a cadence
        'i7 bVImaj7 iiø V7 i7 bVImaj7 iiø V7',
        'iv7 bVII7 bIIImaj7 bVImaj7 iiø V7 i7 i7',
      ],
      chorus: [
        'bVImaj7 bVII7 i7 i7 bVImaj7 bVII7 iiø V7', // rising to the tonic
        'iv7 bVII7 bIIImaj7 bVImaj7 iiø V7 i7 [iiø V7]',
        'i7 bIIImaj7 bVImaj7 bII7 i7 bIIImaj7 iiø V7', // bII7: V's tritone sub
        'i7 i7 bVII7 bVII7 bVImaj7 V7 i7 V7', // Andalusian
      ],
      tag: ['bVImaj7 V7', 'bII7 V7'],
      bridge: ['iv7 bVII7 bIIImaj7 bVImaj7 iiø V7', 'i7 iv7 bVII7 bIIImaj7 iiø V7', 'bVImaj7 bVII7 i7 i7 iiø V7'],
      riff: ['i7 IV7', 'i7 bVII7'],
      intro: [
        'i7 iv7', // tonic vamp
        'iiø V7', // minor ii-V vamp
        'i7 IV7', // dorian vamp
        'i7 bVII7 bVImaj7 V7', // Andalusian fall
        'i7 bVImaj7 iiø V7', // minor turnaround
        'V7sus V7sus V7sus V7', // dominant pedal
        'bVImaj7 bVII7 i7 [iiø V7]', // rising
      ],
    },
    pre: {
      // The bass climbs ii, bIII, iv, #iv to the dominant.
      climb: ['iiø bIIImaj7 iv7 V7', 'bIIImaj7 iv7 #iv° V7', 'iv7 #iv° V7sus V7', 'iiø [bIIImaj7 iv7] V7sus V7'],
      pedal: ['V7sus V7sus V7sus V7', 'iv7 iv7 V7sus V7', 'bVImaj7 bVImaj7 V7sus V7sus', 'V7sus V7'],
      drop: ['bVImaj7 bVII7 iiø V7', 'iv7 bVImaj7 iiø V7sus', 'iv7 bVII7 bIIImaj7 bVImaj7 iiø V7'],
      stops: ['iv7 bVII7 bVImaj7 V7', 'bVImaj7 bVII7 [i7 iv7] [iiø V7]', 'iiø V7 i7 iv7 bII7 V7'],
      // Colour from outside the key: dorian's IV7 and the Neapolitan bII.
      borrowed: ['IV7 iv7 bIImaj7 V7', 'bVImaj7 bIImaj7 V7sus V7', 'i7 IV7 bVImaj7 bIImaj7 V7sus V7', 'bIImaj7 V7'],
    },
    bridgeKeys: [
      { offset: 3, weight: 3, adventurous: false }, // bIII: the relative major
      { offset: 8, weight: 3, adventurous: false }, // bVI major
      { offset: 5, weight: 2, adventurous: false, mode: 'minor' }, // iv minor
      { offset: 10, weight: 1, adventurous: true }, // bVII major
      { offset: 1, weight: 1, adventurous: true }, // bII: Neapolitan
    ],
    turnarounds: {
      'ii-V': { weight: 3, bars: [['ii:m7b5'], ['V:7alt|7b9']] },
      'bVI-V': { weight: 2, bars: [['bVI:^7#11|^9#11'], ['V:7alt|13b9']] },
      tritone: { weight: 2, bars: [['ii:m7b5'], ['bII:13#11']] },
      Neapolitan: { weight: 1, bars: [['bII:^7#11|^9#11'], ['V:7alt|7b9']] },
      Andalusian: { weight: 2, bars: [['bVII:13|9'], ['bVI:^7#11|^9'], ['V:7alt|7b9']] },
      'sus pedal': { weight: 2, bars: [['V:9sus'], ['V:7alt|13b9']] },
      'truck driver': { weight: 1, bars: [['V:7alt|7b9']] },
      // iv-bVII-bIII-bVI-ii-V, two chords a bar.
      'long way': {
        weight: 1,
        bars: [
          ['iv:m9|m7', 'bVII:13'],
          ['bIII:^9', 'bVI:^7#11'],
          ['ii:m7b5', 'V:7alt'],
        ],
      },
    },
  },

  // Modal jazz-funk (So What, Chameleon, Oye Como Va): long stretches of
  // a dorian m7, its bright IV7, and the bIII and bVII of the parent
  // major. Few cadences, so less reharmonisation; it comes home by the
  // plagal IV7-i, not V-i.
  dorian: {
    weight: 2,
    tonics: [2, 7, 0, 9, 4, 5], // D G C A E F
    tonic: 'min',
    reharm: 0.5,
    finale: [
      ['m11', 'dorian'],
      ['m69', 'dorian'],
    ],
    approach: [['bVII:^9|69'], ['IV:13|9']],
    templates: {
      vamp: ['i7 IV7', 'i7 i7', 'i7 bVIImaj7', 'i7 [v7 IV7]'],
      verse: [
        'i7 i7 IV7 IV7 i7 i7 IV7 IV7',
        'i7 IV7 v7 i7 bIIImaj7 IV7 i7 IV7',
        'i7 bVIImaj7 i7 bVIImaj7 bIIImaj7 IV7 v7 i7',
        'i7 i7 i7 i7 bIIImaj7 bIIImaj7 IV7 IV7',
      ],
      chorus: [
        'bIIImaj7 IV7 i7 i7 bIIImaj7 IV7 v7 i7',
        'bVIImaj7 bIIImaj7 IV7 i7 bVIImaj7 bIIImaj7 IV7 [v7 IV7]',
        'i7 bVIImaj7 bVImaj7 bVIImaj7 i7 bVIImaj7 IV7 IV7', // aeolian bVI for shade
        'IV7 IV7 i7 i7 bVIImaj7 bIIImaj7 IV7 IV7',
      ],
      tag: ['bVIImaj7 IV7', 'bIIImaj7 IV7'],
      riff: ['i7 IV7', 'i7 bVIImaj7'],
      intro: [
        'i7 IV7', // the dorian vamp
        'i7 i7 i7 IV7', // one chord, then its IV
        'i7 bIIImaj7 IV7 i7',
        'i7 bVIImaj7',
        'IV7 IV7 i7 i7',
      ],
    },
    pre: {
      climb: ['i7 ii7 bIIImaj7 IV7', 'ii7 bIIImaj7 IV7 v7', 'bIIImaj7 IV7', 'i7 ii7 bIIImaj7 IV7 v7 IV7'],
      pedal: ['IV7sus IV7sus IV7sus IV7', 'bVIImaj7 bVIImaj7 IV7sus IV7', 'IV7sus IV7'],
      drop: ['bVIImaj7 bIIImaj7 IV7 IV7', 'v7 bVIImaj7 bIIImaj7 IV7', 'i7 bVIImaj7 bVImaj7 bVIImaj7 IV7 IV7'],
      stops: ['bIIImaj7 IV7 v7 IV7', 'bVIImaj7 IV7', 'i7 bIIImaj7 IV7 v7 bVIImaj7 IV7'],
      // Darker colour from aeolian (bVI) and phrygian (bII).
      borrowed: [
        'bVImaj7 bVIImaj7 IV7 IV7',
        'bIImaj7 bIImaj7 bVIImaj7 IV7',
        'bVImaj7 bIImaj7',
        'i7 bVImaj7 bVIImaj7 bIImaj7 bVImaj7 IV7',
      ],
    },
    bridgeKeys: [
      { offset: 10, weight: 3, adventurous: false }, // bVII: the parent major
      { offset: 3, weight: 2, adventurous: false }, // bIII major
      { offset: 5, weight: 2, adventurous: true }, // IV major
      { offset: 8, weight: 2, adventurous: true }, // bVI major
      { offset: 1, weight: 1, adventurous: true, mode: 'minor' }, // a half step up, as in So What
    ],
    turnarounds: {
      plagal: { weight: 3, bars: [['bVII:^9|69'], ['IV:13|9']] },
      'ii-V': { weight: 2, bars: [['ii:m9|m11'], ['V:7alt|7b9']] },
      // The new tonic's chord a half step up, sliding down onto it.
      'side-slip': { weight: 2, bars: [['#i:m11|m9'], ['#i:m11|m9']] },
      aeolian: { weight: 2, bars: [['bVI:^9|^7#11'], ['bVII:^9|69']] },
      'sus pedal': { weight: 1, bars: [['IV:9sus'], ['IV:13|9']] },
      'truck driver': { weight: 1, bars: [['V:7alt|7#9']] },
    },
  },

  // Soul-jazz and funk on a dominant tonic (Cissy Strut, Watermelon Man):
  // I7 against bVII and IV, blues changes, and the funk 7#9. It comes
  // home from bVII, the mixolydian cadence.
  mixolydian: {
    weight: 1,
    tonics: [7, 2, 0, 5, 9, 10], // G D C F A Bb
    tonic: 'dom',
    tonicPalette: 'domTonic',
    reharm: 0.6,
    finale: [
      ['13', 'mixolydian'],
      ['9sus', 'mixolydian'],
    ],
    approach: [['IV:^9|69'], ['bVII:^9|^7#11|69']],
    templates: {
      vamp: ['I7 bVIImaj7', 'I7 IV7', 'I7 I7', 'I7 [v7 I7]'],
      verse: [
        'I7 IV7 I7 I7 IV7 IV7 I7 [ii7 V7]', // eight-bar blues
        'I7 bVIImaj7 I7 bVIImaj7 IVmaj7 IVmaj7 v7 bVIImaj7',
        'I7 I7 bVIImaj7 IVmaj7 I7 I7 bVIImaj7 IVmaj7', // I-bVII-IV
        'I7 v7 bVIImaj7 IVmaj7 I7 v7 bVIImaj7 I7',
      ],
      chorus: [
        'IVmaj7 bVIImaj7 I7 I7 IVmaj7 bVIImaj7 v7 I7',
        'I7 bIIImaj7 IVmaj7 I7 I7 bIIImaj7 IVmaj7 bVIImaj7', // the blues bIII
        'IV7 IV7 I7 I7 V7 IV7 I7 V7', // the blues' last eight bars
        'bVIImaj7 IVmaj7 I7 I7 bVIImaj7 IVmaj7 I7 [v7 I7]',
      ],
      tag: ['bVIImaj7 IVmaj7', 'bIIImaj7 IV7'],
      riff: ['I7 bVIImaj7', 'I7 IV7'],
      intro: [
        'I7 I7', // the band on one chord
        'I7 bVIImaj7',
        'I7 IV7',
        'bVIImaj7 IVmaj7 I7 I7',
        'v7 bVIImaj7 IVmaj7 I7',
      ],
    },
    pre: {
      climb: ['IVmaj7 v7 vi7 bVIImaj7', 'IVmaj7 #iv° v7 bVIImaj7', 'ii7 [iiiø IVmaj7] v7 bVIImaj7', 'v7 bVIImaj7'],
      pedal: ['V7sus V7sus V7sus V7', 'IVmaj7 IVmaj7 bVIImaj7 bVIImaj7', 'V7sus V7'],
      drop: ['IVmaj7 v7 bVIImaj7 bVIImaj7', 'vi7 IVmaj7 bVIImaj7 V7sus', 'IVmaj7 I7 v7 vi7 bVIImaj7 IVmaj7'],
      stops: [
        'IVmaj7 bVIImaj7 v7 IVmaj7',
        'IV7 [bIIImaj7 IV7] bVIImaj7 V7sus',
        'v7 bVIImaj7 IVmaj7 I7 bVIImaj7 IVmaj7',
      ],
      // Minor colour: dorian's bIII, aeolian's bVI and iv.
      borrowed: [
        'bVImaj7 bVIImaj7 IVmaj7 IVmaj7',
        'IVmaj7 iv7 bIIImaj7 bVIImaj7',
        'bIIImaj7 bVImaj7 bVIImaj7 V7sus',
        'IVmaj7 iv7 bIIImaj7 bVImaj7 bVIImaj7 V7sus',
      ],
    },
    bridgeKeys: [
      { offset: 5, weight: 3, adventurous: false }, // IV: the parent major
      { offset: 10, weight: 2, adventurous: false }, // bVII major
      { offset: 3, weight: 2, adventurous: true }, // bIII major
      { offset: 8, weight: 2, adventurous: true }, // bVI major
      { offset: 9, weight: 1, adventurous: true, mode: 'minor' }, // vi minor
    ],
    turnarounds: {
      mixolydian: { weight: 3, bars: [['IV:^9|69'], ['bVII:^9|^7#11']] },
      'ii-V': LIFT_TURNAROUNDS['ii-V'],
      backdoor: LIFT_TURNAROUNDS.backdoor,
      tritone: LIFT_TURNAROUNDS.tritone,
      'sus pedal': LIFT_TURNAROUNDS['sus pedal'],
      'truck driver': { weight: 1, bars: [['V:7alt|7#9']] },
    },
  },
};

// =====================================================================
// Arrangement: the fixed figures instruments play
// =====================================================================

export const FIGURES = {
  arp: '[0 1 2 3]*2',
  clav: '[~ 0 ~ 2] [~ ~ 1 ~] [~ 0 ~ 2] [~ 3 ~ ~]',
  scratch: '[0 ~ 0 2] [~ 1 ~ 0] [~ 0 2 ~] [1 ~ 0 ~]',
  stab: 'x ~ ~ ~',
  stops: '[x ~ ~ x ~ ~ x ~]', // stop-time hits: 3 + 3 + 2 eighths
  liftLine: '<[0 [~ 1] 2 [~ 3]] [4 [~ 4] 5 ~]>', // rising into the new key
  pickup: '<~ [~ ~ ~ [-2 -1]]>', // the drum break's bass pickup
  // The final chord, one instrument at a time: [degree, ...].
  finaleDegrees: [4, 9, 13, 15, 17, 19],
};

// The flute doubles the hook an octave up unless that passes E7.
export const DOUBLE_TOP = 100;

// Silence after the final chord, so a looping song breathes before it
// starts again.
export const TAIL_SECONDS = 1;

// =====================================================================
// Titles
// =====================================================================

export const TITLE_WORDS = [
  [
    'Velvet',
    'Midnight',
    'Copper',
    'Neon',
    'Golden',
    'Lazy',
    'Electric',
    'Paper',
    'Silver',
    'Crimson',
    'Hollow',
    'Sunday',
  ],
  [
    'Groove',
    'Avenue',
    'Skyline',
    'Machine',
    'Harbour',
    'Lights',
    'Parade',
    'Static',
    'Garden',
    'Engine',
    'River',
    'Signal',
  ],
];
