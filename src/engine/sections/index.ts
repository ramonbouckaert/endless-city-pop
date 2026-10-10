// The form's sections: one class per type, each writing its part's
// material (its harmony, then its melody, then the drums and bass that
// play it) and playing it, as notes. Each part draws on its own forked
// stream.

import type { Rng } from '../../lib/random';
import type { Key } from '../../theory';
import type { ScoreBand } from '../band';
import type { Form } from '../form';
import { PlayedScoreContext, ScoreContext, WriteContext, type Parts } from './context';
import { isPlayed, type Section } from './section';

/** Writes each part's material, into the form's sections. */
export function writeMaterials(key: Key, form: Form, rng: Rng): void {
  const ctx = new WriteContext(key, form, rng);
  for (const sec of form.sections) ctx.written(sec);
}

/** The parts a section plays, the `repeat`th time its part plays. */
export function sectionParts(sec: Section, band: ScoreBand, repeat: number): Parts {
  const ctx = isPlayed(sec) ? new PlayedScoreContext(sec, band, repeat) : new ScoreContext(sec, band, repeat);
  // TypeScript can't follow isPlayed to the context of sec's own type.
  return sec.play(ctx);
}

export type { Parts } from './context';
export { Breakdown } from './breakdown';
export { Bridge } from './bridge';
export { Chorus } from './chorus';
export { DrumBreak } from './drum-break';
export { Finale } from './finale';
export { Intro } from './intro';
export { Lift } from './lift';
export { Outro } from './outro';
export { PreChorus } from './pre';
export { Riff } from './riff';
export { SoloSection } from './solo';
export { Vamp } from './vamp';
export { Verse } from './verse';
export { isPlayed, isSection, SectionBase, type Placement, type Section, type SectionOf } from './section';
