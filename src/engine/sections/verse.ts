// Keys, clavinet and the lead; later verses add rhythm guitar and a pad.

import { RHYTHM } from '../../style';
import type { MaterialOf } from '../material';
import type { SectionFields, SectionPlan } from '../plan';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection } from './section';

export class Verse extends PlayedSection<'verse'> implements Readonly<SectionFields['verse']> {
  readonly later: boolean;
  readonly material: MaterialOf<'verse'>;

  constructor(plan: SectionPlan<'verse'>, ctx: BuildContext) {
    super(plan);
    this.later = plan.later;
    this.material = ctx.material(this, (rng) => {
      const bars = ctx.progress(rng.pick(ctx.tonality.templatesFor('verse')), 8, rng.fork('harmony'));
      return {
        ...ctx.band('verse', ctx.key, bars, RHYTHM.verse, rng.fork('groove')),
        melody: ctx.melody('verse', ctx.key, bars, rng.fork('melody')),
      };
    });
  }

  protected play(ctx: PlayedScoreContext<'verse'>): Parts {
    const { band, C, B } = ctx;
    const { later } = this;
    return {
      drums: ctx.drums(),
      pitched: [
        B,
        band.keys(C),
        band.clav(C),
        band.lead(ctx.line(this.material.melody)),
        later && band.scratch(C),
        later && band.pad(C),
      ],
    };
  }
}
