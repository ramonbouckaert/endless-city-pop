import type { Parts, PlayedContext } from './context';

// The riff on horns, harmonised a third below.
export function riff(ctx: PlayedContext<'riff'>): Parts {
  const { band, C, B } = ctx;
  return {
    drums: ctx.drums(),
    pitched: [
      B,
      band.horns(band.line(band.harmonize(ctx.degrees(ctx.mat.melody), 2), ctx.scale)),
      band.keys(C).gain(0.28),
      band.clav(C),
    ],
  };
}
