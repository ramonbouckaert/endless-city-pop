import type { MaterialOf } from '../../model';
import { COMP } from '../figures';
import type { Parts, SectionContext } from './context';

// The soloist over the band, or over a bossa comp.
export function solo(ctx: SectionContext<MaterialOf<'solo'>>): Parts {
  const { band, C, B, mat } = ctx;
  const bossa = mat.comp === 'bossa';
  return {
    drums: ctx.drums(),
    pitched: [
      B,
      bossa ? band.keys(C, COMP.bossa).gain(0.26) : band.keys(C).gain(0.3),
      bossa ? band.strings(C).gain(0.08) : band.clav(C),
      band.soloist(ctx.sec.opts.soloist!, ctx.soloLine(mat.solo)).pan(bossa ? 0.42 : 0.55),
    ],
  };
}
