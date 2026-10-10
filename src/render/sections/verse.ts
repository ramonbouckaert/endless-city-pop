import type { MaterialOf } from '../../model';
import type { Parts, SectionContext } from './context';

// Keys, clavinet and the lead; later verses add rhythm guitar and a pad.
export function verse(ctx: SectionContext<MaterialOf<'verse'>>): Parts {
  const { band, C, B } = ctx;
  const later = ctx.sec.opts.second;
  return {
    drums: ctx.drums(),
    pitched: [
      B,
      band.keys(C),
      band.clav(C),
      band.lead(ctx.line(ctx.mat.melody)),
      later && band.scratch(C),
      later && band.pad(C),
    ],
  };
}
