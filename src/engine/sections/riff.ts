// A loop of the key's riff chords, the riff on horns harmonised a third below.

import type { Rng } from '../../lib/random';
import { RHYTHM } from '../../style';
import type { MaterialOf } from '../material';
import type { Parts, PlayedScoreContext, WriteContext } from './context';
import { SectionBase, type Placement } from './section';

export class Riff extends SectionBase<'riff'> {
  constructor(bars: number, placement?: Placement) {
    super('riff', bars, placement);
  }

  protected compose(ctx: WriteContext, rng: Rng): MaterialOf<'riff'> {
    const bars = ctx.loop('riff', rng.fork('loop'));
    return {
      ...ctx.band('riff', ctx.key, bars, RHYTHM.riff, rng.fork('groove')),
      melody: ctx.melody('riff', ctx.key, bars, rng.fork('melody')),
    };
  }

  play(ctx: PlayedScoreContext<'riff'>): Parts {
    const { band, C, B } = ctx;
    return {
      drums: ctx.drums(),
      pitched: [B, band.horns(ctx.harmonized(this.material.melody, 2)), band.keys(C).gain(0.28), band.clav(C)],
    };
  }
}
