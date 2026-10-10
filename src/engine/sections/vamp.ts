// The vamp's chords, and how its drums come in: after two bars, with kick
// and hats alone at first, or throughout. When the vamp comes back, the
// band is already going.

import type { Rng } from '../../lib/random';
import { RHYTHM, VAMP_ENTRIES } from '../../style';
import { Part, rise } from '../score';
import type { MaterialOf } from '../material';
import type { Parts, PlayedScoreContext, WriteContext } from './context';
import { SectionBase, type Placement } from './section';

export class Vamp extends SectionBase<'vamp'> {
  /** The opening vamp back: the band already going. */
  readonly returning: boolean;

  constructor(bars: number, { returning, ...placement }: { returning: boolean } & Placement) {
    super('vamp', bars, placement);
    this.returning = returning;
  }

  protected compose(ctx: WriteContext, rng: Rng): MaterialOf<'vamp'> {
    return {
      ...ctx.band('vamp', ctx.key, ctx.vampBars(), RHYTHM.vamp, rng.fork('groove')),
      variant: rng.weightedKey(VAMP_ENTRIES),
    };
  }

  play(ctx: PlayedScoreContext<'vamp'>): Parts {
    const { band, C, B, len } = ctx;
    const entry = this.returning ? 'full' : this.material.variant;
    let drums;
    if (entry === 'late') drums = [Part.stack(...ctx.drums()).mask(ctx.from(2))];
    else if (entry === 'light')
      drums = ctx.drums((role) => (role === 'kick' || role === 'hat' ? undefined : ctx.from(2)));
    else drums = ctx.drums();
    return { drums, pitched: [B, band.keys(C).lpf(rise(700, 8000, len))] };
  }
}
