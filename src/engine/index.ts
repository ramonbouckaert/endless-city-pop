// The engine: Song.generate() writes a song as plain musical data (its
// form, and each part's chords, notes and drum steps); ScoreArranger
// turns it into timed notes, with the controls that shape their sound.
// Each section of the form is an instance of its type's class, in
// sections/: its fields, how its material is written and how it plays.
// midi/ writes a score as a MIDI file, which the app plays and the
// download saves.

export { ScoreArranger } from './arranger';
export { BassLine, type BassNote } from './bass';
export type { DrumFill, DrumHit, DrumPart, Drums } from './drums';
export { Form, type Playhead } from './form';
export { Harmonizer } from './harmony';
export { Line, type Note } from './line';
export { Melody, Solo, type Grace, type MelodyNote, type SoloNote } from './melody';
export { Instruments, type Kit, type PartPath, type SoundPath, type Sounds } from './orchestration';
export type { Controls, Score, ScoreNote, Slide } from './score';
export type { DrumBreakMaterial, FinaleMaterial, Material, MaterialOf, PlayedMaterial } from './material';
export {
  Breakdown,
  Bridge,
  Chorus,
  DrumBreak,
  Finale,
  Intro,
  isPlayed,
  isSection,
  Lift,
  Outro,
  PreChorus,
  Riff,
  SectionBase,
  SoloSection,
  Vamp,
  Verse,
  type Placement,
  type Section,
  type SectionOf,
} from './sections';
export { Song, type SongData } from './song';
export { formatTitle, joinAside, type TitleParts } from './title';
