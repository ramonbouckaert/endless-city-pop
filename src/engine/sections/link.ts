// A bar to three linking a chorus back into the next verse (or, in some
// songs, the intro into the first: Sea Line's): planing chords' last
// bars, add9s or 9sus chords gliding down onto the sus dominant
// (PLANING), over a light groove.

import { GROOVES } from '../../style';

import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection, type Plan, type PlayedMaterial } from './section';

export class Link extends PlayedSection<PlayedMaterial> {
  static readonly id = 'link';
  static readonly short = 'k';

  readonly material: PlayedMaterial;

  constructor(plan: Plan, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const planing = ctx.harmonizer(rng.fork('planing')).planing();
      return ctx.band(ctx.key, planing.slice(planing.length - this.bars), GROOVES.link, rng.fork('groove'));
    });
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, B } = ctx;
    return [ctx.drums(), B, band.keys(C), band.pad(C)];
  }
}
