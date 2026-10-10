// A loop of the key's riff chords, the riff on horns harmonised a third below.

import { RHYTHM } from '../../style';
import type { MaterialOf } from '../material';
import type { SectionPlan } from '../plan';
import type { Parts, PlayedScoreContext, BuildContext } from './context';
import { Section } from './section';

export class Riff extends Section<'riff'> {
  readonly material: MaterialOf<'riff'>;

  constructor(plan: SectionPlan<'riff'>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const bars = ctx.loop('riff', rng.fork('loop'));
      return {
        ...ctx.band('riff', ctx.key, bars, RHYTHM.riff, rng.fork('groove')),
        melody: ctx.melody('riff', ctx.key, bars, rng.fork('melody')),
      };
    });
  }

  play(ctx: PlayedScoreContext<'riff'>): Parts {
    const { band, C, B } = ctx;
    return {
      drums: ctx.drums(),
      pitched: [B, band.horns(ctx.harmonized(this.material.melody, 2)), band.keys(C).gain(0.28), band.clav(C)],
    };
  }
}
