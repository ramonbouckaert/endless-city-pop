// The hook over the chorus's first bars, on pads, keys coming in halfway.

import { COMP, RHYTHM } from '../../style';
import { spans } from '../figures';
import type { MaterialOf } from '../material';
import type { SectionPlan } from '../plan';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection } from './section';

export class Breakdown extends PlayedSection<'breakdown'> {
  readonly material: MaterialOf<'breakdown'>;

  constructor(plan: SectionPlan<'breakdown'>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const bars = ctx.chorusBars().slice(0, this.bars);
      return {
        ...ctx.band('breakdown', ctx.key, bars, RHYTHM.breakdown, rng.fork('groove')),
        melody: ctx.hook().take(bars.length),
      };
    });
  }

  protected play(ctx: PlayedScoreContext<'breakdown'>): Parts {
    const { band, C, underB, len } = ctx;
    return {
      drums: ctx.drums(),
      pitched: [
        underB,
        band.pad(C),
        band.choir(C),
        band.comp(C, spans(COMP.chorus, len)).mask(ctx.from(Math.floor(len / 2))),
        band.lead(ctx.line(this.material.melody)),
      ],
    };
  }
}
