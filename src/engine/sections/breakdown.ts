// The hook over the chorus's first bars, on pads, keys coming in halfway;
// now and then the weather under it.

import { COMP, GROOVES, WEATHER } from '../../style';
import type { Melody } from '../writers';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection, type Plan, type PlayedMaterial } from './section';
import { spans, type NoteSpec } from '../score';

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
        ...ctx.band(ctx.chorusKey(), bars, GROOVES.breakdown, rng.fork('groove')),
        melody: ctx.hook().take(bars.length),
        ...ctx.weather(WEATHER.breakdown, rng.fork('weather')),
      };
    });
  }

  override melodyOver(ctx: PlayedScoreContext): NoteSpec[] | undefined {
    return ctx.line(this.material.melody);
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, underB, len } = ctx;
    return [
      ctx.drums(),
      underB,
      band.pad(C),
      band.choir(C),
      band.comp(C, spans(COMP.chorus, len)).mask(ctx.fromHalf()),
      band.lead(ctx.line(this.material.melody)),
    ];
  }
}
