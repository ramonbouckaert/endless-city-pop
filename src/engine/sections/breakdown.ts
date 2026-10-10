// The hook over the chorus's first bars, on pads, keys coming in halfway.

import { COMP, GROOVES } from '../../style';
import type { Melody } from '../writers';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection, type Plan, type PlayedMaterial } from './section';
import { spans } from '../score';

export interface BreakdownMaterial extends PlayedMaterial {
  melody: Melody;
}

export class Breakdown extends PlayedSection<BreakdownMaterial> {
  static readonly id = 'breakdown';
  static readonly short = 'bd';
  static override readonly handsOver = true;

  readonly material: BreakdownMaterial;

  constructor(plan: Plan, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const bars = ctx.chorusBars().slice(0, this.bars);
      return {
        ...ctx.band(ctx.key, bars, GROOVES.breakdown, rng.fork('groove')),
        melody: ctx.hook().take(bars.length),
      };
    });
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, underB, len } = ctx;
    return [
      ctx.drums(),
      underB,
      band.pad(C),
      band.choir(C),
      band.comp(C, spans(COMP.chorus, len)).mask(ctx.from(Math.floor(len / 2))),
      band.lead(ctx.line(this.material.melody)),
    ];
  }
}
