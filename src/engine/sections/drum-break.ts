// Drums alone, then a bass pickup into the next section's first chord.

import { DRUM_BREAK } from '../../style';
import { DrumWriter, drumNotes } from '../drums';
import { onChord } from '../score';
import type { MaterialOf } from '../material';
import type { SectionPlan } from '../plan';
import type { Parts, ScoreContext, BuildContext } from './context';
import { Section } from './section';

export class DrumBreak extends Section<'drumBreak'> {
  readonly material: MaterialOf<'drumBreak'>;

  constructor(plan: SectionPlan<'drumBreak'>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const next = ctx.plan.next(plan);
      const into = next && ctx.section(next).material;
      if (!into || !('bars' in into)) throw new Error(`A drum break can't pick up into ${next?.type ?? 'nothing'}`);
      return {
        type: 'drumBreak',
        key: ctx.key,
        drums: new DrumWriter(DRUM_BREAK, rng.fork('drums')).write(),
        pickup: { into: into.bars[0][0], key: into.key, shift: next.shift },
      };
    });
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
