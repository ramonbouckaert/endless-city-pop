// Changes as long as the section, and the line over them: the first solo
// over the band, a later one never over what the one before had (a bossa
// comp, perhaps).

import { COMP, RHYTHM, SOLO_COMPS } from '../../style';
import { spans } from '../figures';
import type { MaterialOf } from '../material';
import { SoloWriter } from '../melody';
import type { SectionFields, SectionPlan } from '../plan';
import { SoloChangesWriter } from '../solo-changes';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection } from './section';

export class SoloSection extends PlayedSection<'solo'> implements Readonly<SectionFields['solo']> {
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
        ...ctx.band('solo', ctx.key, bars, RHYTHM.solo[variant], rng.fork('groove')),
        variant,
        solo: new SoloWriter(rng.fork('line')).write(bars),
      };
    });
  }

  protected play(ctx: PlayedScoreContext<'solo'>): Parts {
    const { band, C, B, len } = ctx;
    const mat = this.material;
    const bossa = mat.variant === 'bossa';
    return {
      drums: ctx.drums(),
      pitched: [
        B,
        bossa ? band.keysUnder(C, spans(COMP.bossa, len)) : band.keysUnder(C),
        bossa ? band.strings(C) : band.clav(C),
        band.soloist(this.soloist, ctx.soloLine(mat.solo)).pan(bossa ? 0.42 : 0.55),
      ],
    };
  }
}
