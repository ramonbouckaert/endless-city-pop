// The song model: Song.generate() writes a song as plain musical data
// (notes, chords, drum steps). It loads no Strudel, so tests and scripts
// can use it as is; render/ turns a song into a Strudel pattern.

export { BassLine, type BassNote } from './bass';
export type { DrumFill, DrumHit, DrumPart, Drums } from './drums';
export { Harmonizer } from './harmony';
export { Line, type Note } from './line';
export { materialOf, type DrumBreakMaterial, type FinaleMaterial, type Material, type MaterialOf } from './material';
export { Melody, Solo, type Grace, type MelodyNote, type SoloNote } from './melody';
export { level, recording, voiceGain, type Instruments, type Sounds } from './orchestration';
export { Section, sectionStarts, type SectionOpts } from './section';
export { Song } from './song';
export { formatTitle, joinAside, type TitleParts } from './title';
