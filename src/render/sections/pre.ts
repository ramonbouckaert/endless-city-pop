import { saw, stack } from '@strudel/core';
import type { Parts, PlayedContext } from './context';

// The pre-chorus, in its flavour's texture. Later rounds add a layer.
export function pre(ctx: PlayedContext<'pre'>): Parts {
  const { band, C, B, len, riser } = ctx;
  const drums = ctx.drums();
  const lead = band.lead(ctx.line(ctx.mat.melody));
  const { later } = ctx.sec;
  switch (ctx.mat.variant) {
    case 'pedal':
      // Long notes over a held bass, strings swelling.
      return {
        drums: [...drums, riser],
        pitched: [B, band.softKeys(C).gain(0.26), ctx.swell(0.14), lead, later && band.choir(C)],
      };
    case 'drop':
      // The drums drop out, then come back halfway.
      return {
        drums: [stack(...drums).mask(ctx.from(Math.floor(len / 2)))],
        pitched: [B.gain(0.6), band.pad(C), band.softKeys(C).gain(0.26), lead, later && band.strings(C)],
      };
    case 'stops': {
      // Stop-time hits under a free lead.
      const stop = ctx.stopTime(drums);
      return { drums: stop.drums, pitched: [...stop.pitched, lead, later && band.strings(C)] };
    }
    case 'borrowed':
      return {
        drums,
        pitched: [B, band.keys(C).gain(0.28), band.strings(C), band.choir(C), lead, later && band.pad(C)],
      };
    case 'climb':
      // Eighth-note keys opening up over a noise riser.
      return {
        drums: [...drums, riser],
        pitched: [
          B,
          band.keys(C, 'x*8').clip(0.4).gain(0.3).lpf(saw.slow(len).range(800, 7000)),
          band.pad(C),
          lead,
          later && band.strings(C),
        ],
      };
  }
}
