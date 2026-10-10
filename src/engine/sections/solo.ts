// Changes as long as the section, and the line over them: the first solo
// over the band, a later one never over what the one before had (a bossa
// comp, perhaps).

import { SOLO_COMPS } from '../../style';
import { COMP, spans } from '../figures';
import { SoloWriter } from '../melody';
import { SoloChangesWriter } from '../solo-changes';
import type { MaterialOf } from '../material';
import type { SectionFields, SectionPlan } from '../plan';
import type { Parts, PlayedScoreContext, BuildContext } from './context';
import { Section } from './section';

export class SoloSection extends Section<'solo'> implements Readonly<SectionFields['solo']> {
  readonly soloist: number;
  readonly material: MaterialOf<'solo'>;

  constructor(plan: SectionPlan<'solo'>, ctx: BuildContext) {
    super(plan);
    this.soloist = plan.soloist;
    this.material = ctx.material(this, (rng) => {
      const before = ctx.plan.previous(plan);
      const variant = before ? rng.weightedKey(SOLO_COMPS, ctx.section(before).material.variant) : 'band';
      const bars = new SoloChangesWriter(ctx.key, rng.fork('changes')).write(this.bars);
      return {
        ...ctx.band('solo', ctx.key, bars, SOLO_COMPS[variant].groove, rng.fork('groove')),
        variant,
        solo: new SoloWriter(rng.fork('line')).write(bars),
      };
    });
  }

  play(ctx: PlayedScoreContext<'solo'>): Parts {
    const { band, C, B, len } = ctx;
    const mat = this.material;
    const bossa = mat.variant === 'bossa';
    return {
      drums: ctx.drums(),
      pitched: [
        B,
        bossa ? band.keys(C, spans(COMP.bossa, len)).gain(0.26) : band.keys(C).gain(0.3),
        bossa ? band.strings(C).gain(0.08) : band.clav(C),
        band.soloist(this.soloist, ctx.soloLine(mat.solo)).pan(bossa ? 0.42 : 0.55),
      ],
    };
  }
}
