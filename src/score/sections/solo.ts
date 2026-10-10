import { COMP, spans } from '../figures';
import type { Parts, PlayedScoreContext } from './context';

// The soloist over the band, or over a bossa comp.
export function solo(ctx: PlayedScoreContext<'solo'>): Parts {
  const { band, C, B, mat, len } = ctx;
  const bossa = mat.variant === 'bossa';
  return {
    drums: ctx.drums(),
    pitched: [
      B,
      bossa ? band.keys(C, spans(COMP.bossa, len)).gain(0.26) : band.keys(C).gain(0.3),
      bossa ? band.strings(C).gain(0.08) : band.clav(C),
      band.soloist(ctx.sec.soloist, ctx.soloLine(mat.solo)).pan(bossa ? 0.42 : 0.55),
    ],
  };
}
