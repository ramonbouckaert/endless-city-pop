import type { MaterialOf } from '../../model';
import type { Parts, SectionContext } from './context';

// An arpeggio and strings, the lead doubled high on bells.
export function bridge(ctx: SectionContext<MaterialOf<'bridge'>>): Parts {
  const { band, C, B, mat } = ctx;
  return {
    drums: ctx.drums(),
    pitched: [
      B.gain(0.65),
      band.arp(C),
      band.strings(C),
      band.lead(ctx.line(mat.melody)),
      band.bell(ctx.line(mat.melody, 12)).gain(0.15),
    ],
  };
}
