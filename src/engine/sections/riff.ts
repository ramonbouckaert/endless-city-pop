// A loop of the key's riff chords, the riff on horns harmonised a third below.

import { GROOVES, MELODIES } from '../../style';
import type { PlayedMaterial } from '../material';
import type { Melody } from '../melody';
import type { Plan } from '../plan';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection } from './section';

export interface RiffMaterial extends PlayedMaterial {
  melody: Melody;
}

export class Riff extends PlayedSection<RiffMaterial> {
  static readonly id = 'riff';
  static readonly short = 'r';
  static override readonly handsOver = true;

  readonly material: RiffMaterial;

  constructor(plan: Plan, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const bars = ctx.loop(ctx.tonality.templates.riff, rng.fork('loop'));
      return {
        ...ctx.band(ctx.key, bars, GROOVES.riff, rng.fork('groove')),
        melody: ctx.melody(MELODIES.riff, ctx.key, bars, rng.fork('melody')),
      };
    });
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, B } = ctx;
    return [ctx.drums(), B, band.horns(ctx.harmonized(this.material.melody, 2)), band.keysUnder(C), band.clav(C)];
  }
}
