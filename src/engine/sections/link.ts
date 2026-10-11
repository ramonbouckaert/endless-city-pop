// A bar or two linking a chorus back into the next verse (Sea Line's):
// the planing intro's last chords, add9s gliding down onto the sus
// dominant, over a light groove.

import { GROOVES } from '../../style';
import { Harmonizer } from '../writers';
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
      const planing = new Harmonizer(ctx.key, rng.fork('planing')).planing();
      return ctx.band(ctx.key, planing.slice(planing.length - this.bars), GROOVES.link, rng.fork('groove'));
    });
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, B } = ctx;
    return [ctx.drums(), B, band.keys(C), band.pad(C)];
  }
}
