// Drums alone, then a bass pickup into the next section's first chord.

import { DRUM_BREAK } from '../../style';
import type { ScoreBand } from '../band';
import { DrumWriter, drumNotes } from '../drums';
import type { MaterialOf } from '../material';
import type { SectionPlan } from '../plan';
import type { BuildContext } from './build-context';
import { ScoreContext, type Parts } from './score-context';
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
        pickup: { into: into.bars[0][0], shift: next.shift },
      };
    });
  }

  parts(band: ScoreBand, repeat: number): Parts {
    const ctx = new ScoreContext(this, band, repeat);
    const { into, shift } = this.material.pickup;
    return {
      drums: [drumNotes(band, this.material.drums, ctx.len, repeat)],
      pitched: [ctx.pickupInto(into).transpose(shift - this.shift)],
    };
  }
}
