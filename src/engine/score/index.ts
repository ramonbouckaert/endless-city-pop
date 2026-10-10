// A song as timed notes: Part and Changes (score.ts), the band that
// plays each part at its level (ScoreBand), and the arranger that plays
// every section of a song into its Score.

export { ScoreArranger } from './arranger';
export { ScoreBand } from './band';
export {
  Changes,
  lastBar,
  onChord,
  Part,
  rise,
  scoreNote,
  spans,
  timed,
  within,
  type NoteSpec,
  type Score,
  type Span,
  type Timed,
} from './score';
