import { saw, stack } from '@strudel/core';
import type { MaterialOf } from '../../model';
import type { Parts, SectionContext } from './context';

// The opening vamp's drums come in after two bars, start with kick and
// hats alone, or play throughout, as the material says; when the vamp
// comes back, the band is already going.
export function vamp(ctx: SectionContext<MaterialOf<'vamp'>>): Parts {
  const { band, C, B, len } = ctx;
  const entry = ctx.sec.opts.second ? 'full' : ctx.mat.entry;
  let drums;
  if (entry === 'late') drums = [stack(...ctx.drums()).mask(ctx.from(2))];
  else if (entry === 'light')
    drums = ctx.drums((role) => (role === 'kick' || role === 'hat' ? undefined : ctx.from(2)));
  else drums = ctx.drums();
  return { drums, pitched: [B, band.keys(C).lpf(saw.slow(len).range(700, 8000))] };
}
