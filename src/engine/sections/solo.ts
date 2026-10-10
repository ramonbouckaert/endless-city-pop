// Changes as long as the section, and the line over them: the first solo
// over the band, a later one never over what the one before had (a bossa
// comp, perhaps).

import type { Rng } from '../../lib/random';
import { SOLO_COMPS } from '../../style';
import { COMP, spans } from '../figures';
import { SoloWriter } from '../melody';
import { SoloChangesWriter } from '../solo-changes';
import type { MaterialOf } from '../material';
import type { Parts, PlayedScoreContext, WriteContext } from './context';
import { SectionBase, type Placement } from './section';

export class SoloSection extends SectionBase<'solo'> {
  /** Its soloist, as an index into the song's soloists. */
  readonly soloist: number;

  constructor(bars: number, { soloist, ...placement }: { soloist: number } & Placement) {
    super('solo', bars, placement);
    this.soloist = soloist;
  }

  protected compose(ctx: WriteContext, rng: Rng): MaterialOf<'solo'> {
    const before = ctx.form.previous(this);
    const variant = before ? rng.weightedKey(SOLO_COMPS, ctx.written(before).material.variant) : 'band';
    const bars = new SoloChangesWriter(ctx.key, rng.fork('changes')).write(this.bars);
    return {
      ...ctx.band('solo', ctx.key, bars, SOLO_COMPS[variant].groove, rng.fork('groove')),
      variant,
      solo: new SoloWriter(rng.fork('line')).write(bars),
    };
  }

  play(ctx: PlayedScoreContext<'solo'>): Parts {
    const { band, C, B, len } = ctx;
    const mat = this.material;
    const bossa = mat.variant === 'bossa';
    return {
      drums: ctx.drums(),
      pitched: [
        B,
        bossa ? band.keys(C, spans(COMP.bossa, len)).gain(0.26) : band.keys(C).gain(0.3),
        bossa ? band.strings(C).gain(0.08) : band.clav(C),
        band.soloist(this.soloist, ctx.soloLine(mat.solo)).pan(bossa ? 0.42 : 0.55),
      ],
    };
  }
}
