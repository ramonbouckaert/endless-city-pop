// The hook over the chorus's first bars, on pads, keys coming in halfway.

import { RHYTHM } from '../../style';
import { COMP, spans } from '../figures';
import type { MaterialOf } from '../material';
import type { SectionPlan } from '../plan';
import type { Parts, PlayedScoreContext, BuildContext } from './context';
import { Section } from './section';

export class Breakdown extends Section<'breakdown'> {
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

  play(ctx: PlayedScoreContext<'breakdown'>): Parts {
    const { band, C, B, len } = ctx;
    return {
      drums: ctx.drums(),
      pitched: [
        B.gain(0.6),
        band.pad(C).gain(0.18),
        band.choir(C),
        band
          .keys(C, spans(COMP.chorus, len))
          .clip(0.5)
          .gain(0.24)
          .mask(ctx.from(Math.floor(len / 2))),
        band.lead(ctx.line(this.material.melody)),
      ],
    };
  }
}
