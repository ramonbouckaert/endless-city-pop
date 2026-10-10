import { drumNotes } from '../drums';
import { FIGURES, lastBar, timed } from '../figures';
import type { Parts, ScoreContext } from './context';
import { onChord } from './context';

// Drums alone, then a bass pickup into what follows.
export function drumBreak(ctx: ScoreContext<'drumBreak'>): Parts {
  const { band, mat, len, repeat } = ctx;
  const { into, shift } = mat.pickup;
  const pickup = timed(lastBar(len, FIGURES.pickup), len).map(({ time, dur, value }) => ({
    time,
    dur,
    note: onChord(into, value),
  }));
  return { drums: [drumNotes(band, mat.drums, len, repeat)], pitched: [band.bass(pickup).transpose(shift)] };
}
