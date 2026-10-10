// The engine: Song.generate() writes a song as plain musical data (its
// form, and each part's chords, notes and drum steps); ScoreArranger
// turns it into timed notes, with the controls that shape their sound.
// FormPlanner plans the form; each section is built from its plan as an
// instance of its type's class, in sections/: its fields, its material
// (written as it is built) and how it plays.
// midi/ writes a score as a MIDI file, which the app plays and the
// download saves.

export { ScoreArranger } from './arranger';
export { Form, type Playhead } from './form';
export { Harmonizer } from './harmony';
export { Instruments } from './orchestration';
export type { Score } from './score';
export * from './sections';
export { planned, type Plan } from './plan';
export { Song } from './song';
export { joinAside, type TitleParts } from './title';
