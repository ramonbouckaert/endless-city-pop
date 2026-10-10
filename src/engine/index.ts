// The engine: Song.generate() writes a song as plain musical data (its
// form, and each part's chords, notes and drum steps); ScoreArranger
// turns it into timed notes, with the controls that shape their sound.
// song/ picks what a song is from its seed and plans its form; each
// section is built from its plan as an instance of its kind's class, in
// sections/ (its fields, its material, written as it is built by the
// generators in writers/, and how it plays); score/ holds the notes.
// midi/ writes a score as a MIDI file, which the app plays and the
// download saves.

export { ScoreArranger, type Score } from './score';
export {
  Breakdown,
  Bridge,
  Chorus,
  DrumBreak,
  Finale,
  Form,
  Intro,
  Lift,
  Outro,
  planned,
  PreChorus,
  Riff,
  SoloSection,
  Vamp,
  Verse,
  type AnySection,
  type Material,
  type Plan,
  type Playhead,
} from './sections';
export { Instruments, joinAside, Song, type TitleParts } from './song';
export { Harmonizer, type Grace } from './writers';
