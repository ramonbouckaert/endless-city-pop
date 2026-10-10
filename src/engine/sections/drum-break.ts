// Drums alone, then a bass pickup into the next section's first chord.

import type { Rng } from '../../lib/random';
import { DRUM_BREAK } from '../../style';
import { DrumWriter, drumNotes } from '../drums';
import { onChord } from '../score';
import type { MaterialOf } from '../material';
import type { Parts, ScoreContext, WriteContext } from './context';
import { SectionBase, type Placement } from './section';

export class DrumBreak extends SectionBase<'drumBreak'> {
  constructor(bars: number, placement?: Placement) {
    super('drumBreak', bars, placement);
  }

  protected compose(ctx: WriteContext, rng: Rng): MaterialOf<'drumBreak'> {
    const next = ctx.form.next(this);
    const into = next && ctx.written(next).material;
    if (!into || !('bars' in into)) throw new Error(`A drum break can't pick up into ${next?.type ?? 'nothing'}`);
    return {
      type: 'drumBreak',
      key: ctx.key,
      drums: new DrumWriter(DRUM_BREAK, rng.fork('drums')).write(),
      pickup: { into: into.bars[0][0], key: into.key, shift: next.shift },
    };
  }

  play(ctx: ScoreContext<'drumBreak'>): Parts {
    const { band, len, repeat } = ctx;
    const mat = this.material;
    const { into, shift } = mat.pickup;
    return {
      drums: [drumNotes(band, mat.drums, len, repeat)],
      pitched: [ctx.pickup((degree) => onChord(into, degree)).transpose(shift)],
    };
  }
}
