import { COMP, spans } from '../figures';
import type { Parts, PlayedScoreContext } from './context';

// The hook, doubled an octave up if it fits; later choruses add the
// answer, and the last one stabs, strings and choir.
export function chorus(ctx: PlayedScoreContext<'chorus'>): Parts {
  const { band, C, B, mat, len } = ctx;
  const { answer, big } = ctx.sec;
  return {
    drums: ctx.drums(),
    pitched: [
      B,
      band.keys(C, spans(COMP.chorus, len)).clip(0.5).gain(0.28),
      band.clav(C),
      band.pad(C),
      band.lead(ctx.line(mat.melody)),
      band.double(ctx.line(mat.melody), ctx.octaveUp(mat.melody)),
      answer && band.counter(ctx.line(mat.answer)),
      big && band.stabs(C),
      big && band.strings(C),
      big && band.choir(C),
    ],
  };
}
