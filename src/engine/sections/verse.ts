// Keys, clavinet and the lead; later verses add rhythm guitar and a pad.

import type { Rng } from '../../lib/random';
import { RHYTHM } from '../../style';
import type { MaterialOf } from '../material';
import type { Parts, PlayedScoreContext, WriteContext } from './context';
import { SectionBase, type Placement } from './section';

export class Verse extends SectionBase<'verse'> {
  /** A later round adds a layer. */
  readonly later: boolean;

  constructor(bars: number, { later, ...placement }: { later: boolean } & Placement) {
    super('verse', bars, placement);
    this.later = later;
  }

  protected compose(ctx: WriteContext, rng: Rng): MaterialOf<'verse'> {
    const bars = ctx.progress(rng.pick(ctx.tonality.templatesFor('verse')), 8, rng.fork('harmony'));
    return {
      ...ctx.band('verse', ctx.key, bars, RHYTHM.verse, rng.fork('groove')),
      melody: ctx.melody('verse', ctx.key, bars, rng.fork('melody')),
    };
  }

  play(ctx: PlayedScoreContext<'verse'>): Parts {
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
