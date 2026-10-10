// A song as timed notes: every note each part plays, with the controls
// that shape its sound. midi/ writes it as a MIDI file, which the app
// plays and the download saves.

export { ScoreArranger } from './arranger';
export type { Controls, Score, ScoreNote, Slide } from './score';
