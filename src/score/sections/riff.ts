import type { Parts, PlayedScoreContext } from './context';

// The riff on horns, harmonised a third below.
export function riff(ctx: PlayedScoreContext<'riff'>): Parts {
  const { band, C, B } = ctx;
  return {
    drums: ctx.drums(),
    pitched: [B, band.horns(ctx.harmonized(ctx.mat.melody, 2)), band.keys(C).gain(0.28), band.clav(C)],
  };
}
