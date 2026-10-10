import { Part, rise } from '../score';
import type { Parts, PlayedScoreContext } from './context';

// The opening vamp's drums come in after two bars, start with kick and
// hats alone, or play throughout, as the material says; when the vamp
// comes back, the band is already going.
export function vamp(ctx: PlayedScoreContext<'vamp'>): Parts {
  const { band, C, B, len } = ctx;
  const entry = ctx.sec.returning ? 'full' : ctx.mat.variant;
  let drums;
  if (entry === 'late') drums = [Part.stack(...ctx.drums()).mask(ctx.from(2))];
  else if (entry === 'light')
    drums = ctx.drums((role) => (role === 'kick' || role === 'hat' ? undefined : ctx.from(2)));
  else drums = ctx.drums();
  return { drums, pitched: [B, band.keys(C).lpf(rise(700, 8000, len))] };
}
