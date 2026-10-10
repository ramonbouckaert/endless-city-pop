// The song model: Song.generate() writes a song. It loads no Strudel,
// so tests and scripts can use it as is; import Arranger from
// './arranger' to turn a song into a Strudel pattern.

export { CHORDS, FINALE_STYLES, LIFT_STYLES, LIFT_TURNAROUNDS, MODES, PALETTE, PRE_FLAVOURS, STYLE, TONALITIES } from './constants';
export { FORM } from './form';
export { BAND, GM_PROGRAMS, KIT_GAPS, KITS, PICKS, SAME_SOUND, SOUND_LEVELS, SOUND_TOPS, VOICES } from './instruments';
export { Template } from './music';
export { Section } from './form';
export { Melody, Solo } from './melody';
export { Chord, Key, pcName, Roman, Scale } from './music';
export { randomSeed, Rng } from './random';
export { Song } from './song';
export { joinAside, titleFor, titleParts } from './title';
export type * from './types';
