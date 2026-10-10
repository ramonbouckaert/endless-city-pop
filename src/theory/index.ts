// Music theory as values: scales, keys, chords and roman numerals. No
// style, no randomness: style/ and model/ build on it.

export { Chord, BASS_LOW, chordAt, type Bar } from './chord';
export { Key } from './key';
export { mod12, pcName, reshape } from './pitch';
export { parseChordSpec, Roman, Template, type ChordSpec } from './roman';
export { Scale, type Degree } from './scale';
export { CHORDS, MODES, type ChordClass, type ChordDef, type Mode } from './tables';
export { DEFAULT_ANCHOR, voice, voicingNote } from './voicing';
