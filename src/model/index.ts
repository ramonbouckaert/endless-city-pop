// The song model: Song.generate() writes a song as plain musical data
// (notes, chords, drum steps). It loads no Strudel, so tests and scripts
// can use it as is; render/ turns a song into a Strudel pattern.

export { BassLine, type BassNote } from './bass';
export type { DrumFill, DrumHit, DrumPart, Drums } from './drums';
export { Harmonizer } from './harmony';
export { Line, type Note } from './line';
export {
  isPlayed,
  materialOf,
  type DrumBreakMaterial,
  type FinaleMaterial,
  type Material,
  type MaterialOf,
  type PlayedMaterial,
  type PlayedType,
} from './material';
export { Melody, Solo, type Grace, type MelodyNote, type SoloNote } from './melody';
export { Instruments, Kit, partLabel, pickedFrom, type PartPath, type SoundPath, type Sounds } from './orchestration';
export { Form, type Playhead } from './form';
export { isSection, section, type Section, type SectionFields, type SectionOf } from './section';
export { Song, type SongData } from './song';
export { formatTitle, joinAside, type TitleParts } from './title';
