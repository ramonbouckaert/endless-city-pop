// The facts of Western harmony this project uses: note names, modes
// and chord-scales, chord symbols and how chords and numerals spell.

// The modes a song can be in: church modes with a tonality each (style/tonalities).
export type Mode = 'major' | 'minor' | 'dorian' | 'mixolydian' | 'phrygian';

export type ChordClass = 'maj' | 'min' | 'dom' | 'hdim' | 'dim' | 'sus' | 'power' | 'aug';
export interface ChordDef {
  cls: ChordClass;
  tones: readonly number[]; // semitones above the root
}

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Modes and chord-scales, as semitones above their root.
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

// Chord symbols, written as iReal Pro writes them (^ for major seventh).
const CHORD_DEFS = {
  '': { cls: 'maj', tones: [0, 4, 7] },
  add9: { cls: 'maj', tones: [0, 4, 7, 14] },
  '^7': { cls: 'maj', tones: [0, 4, 7, 11] },
  '^9': { cls: 'maj', tones: [0, 4, 7, 11, 14] },
  6: { cls: 'maj', tones: [0, 4, 7, 9] },
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
  m7add11: { cls: 'min', tones: [0, 3, 7, 10, 17] }, // a phrygian tonic: no 9th
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
  sus2: { cls: 'sus', tones: [0, 2, 7] },
  5: { cls: 'power', tones: [0, 7] },
  '7#5': { cls: 'aug', tones: [0, 4, 8, 10] }, // the augmented passing chord: i, I+, iv
} satisfies Record<string, ChordDef>;
export const CHORDS: Readonly<Record<string, ChordDef>> = CHORD_DEFS;

/** A chord symbol in CHORDS. */
export type ChordSymbol = `${keyof typeof CHORD_DEFS}`;

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
  '7#5': 'altered',
};

// A chromatic chord's usual chord-scale, by family. A dominant
// resolving to a minor chord takes DOM_TO_MINOR_SCALE instead, and one
// falling a half step TRITONE_SUB_SCALE.
export const FAMILY_SCALES: Readonly<Record<ChordClass, string>> = {
  maj: 'lydian',
  min: 'dorian',
  dom: 'mixolydian',
  hdim: 'locrian',
  dim: 'locrian',
  sus: 'mixolydian',
  power: 'mixolydian',
  aug: 'altered',
};
export const DOM_TO_MINOR_SCALE = 'phrygian:dominant';
// A tritone sub's chord-scale: its #11 is the 5th of the chord it stands for.
export const TRITONE_SUB_SCALE = 'lydian:dominant';

// Numeral suffixes that name their chord exactly, so a template keeps
// that colour rather than drawing one: an upper-case numeral's, then a
// lower-case one's ("iv6" is a minor sixth, "Iadd9" a plain add9).
export const LITERAL_SUFFIXES: Readonly<Record<'upper' | 'lower', Readonly<Record<string, string>>>> = {
  upper: { '6': '6', add9: 'add9', sus2: 'sus2' },
  lower: { '6': 'm6', add9: 'madd9' },
};

export const NUMERALS = { i: 0, ii: 2, iii: 4, iv: 5, v: 7, vi: 9, vii: 11 } as const satisfies Record<string, number>;

/** A roman numeral, in lower case (a key of NUMERALS). */
export type NumeralName = keyof typeof NUMERALS;
