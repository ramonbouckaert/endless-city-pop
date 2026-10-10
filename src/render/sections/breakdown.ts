import { COMP } from '../figures';
import type { Parts, PlayedContext } from './context';

// The hook over pads, keys coming in halfway.
export function breakdown(ctx: PlayedContext<'breakdown'>): Parts {
  const { band, C, B, len } = ctx;
  return {
    drums: ctx.drums(),
    pitched: [
      B.gain(0.6),
      band.pad(C).gain(0.18),
      band.choir(C),
      band
        .keys(C, COMP.chorus)
        .clip(0.5)
        .gain(0.24)
        .mask(ctx.from(Math.floor(len / 2))),
      band.lead(ctx.line(ctx.mat.melody)),
    ],
  };
}
