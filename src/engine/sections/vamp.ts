// The vamp's chords, and how its drums come in: after two bars, with kick
// and hats alone at first, or throughout. When the vamp comes back, the
// band is already going.

import { RHYTHM, VAMP_ENTRIES } from '../../style';
import { Part, rise } from '../score';
import type { MaterialOf } from '../material';
import type { SectionFields, SectionPlan } from '../plan';
import type { Parts, PlayedScoreContext, BuildContext } from './context';
import { Section } from './section';

export class Vamp extends Section<'vamp'> implements Readonly<SectionFields['vamp']> {
  readonly returning: boolean;
  readonly material: MaterialOf<'vamp'>;

  constructor(plan: SectionPlan<'vamp'>, ctx: BuildContext) {
    super(plan);
    this.returning = plan.returning;
    this.material = ctx.material(this, (rng) => {
      return {
        ...ctx.band('vamp', ctx.key, ctx.vampBars(), RHYTHM.vamp, rng.fork('groove')),
        variant: rng.weightedKey(VAMP_ENTRIES),
      };
    });
  }

  play(ctx: PlayedScoreContext<'vamp'>): Parts {
    const { band, C, B, len } = ctx;
    const entry = this.returning ? 'full' : this.material.variant;
    let drums;
    if (entry === 'late') drums = [Part.stack(...ctx.drums()).mask(ctx.from(2))];
    else if (entry === 'light')
      drums = ctx.drums((role) => (role === 'kick' || role === 'hat' ? undefined : ctx.from(2)));
    else drums = ctx.drums();
    return { drums, pitched: [B, band.keys(C).lpf(rise(700, 8000, len))] };
  }
}
