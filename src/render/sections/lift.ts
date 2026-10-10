import { stack } from '@strudel/core';
import { FIGURES } from '../figures';
import { keyScale, lastBar } from '../notation';
import type { Parts, PlayedContext } from './context';

// A turnaround into the next chorus's key, played in the lift's style.
export function lift(ctx: PlayedContext<'lift'>): Parts {
  const { band, C, S, B, len, mat } = ctx;
  // Built only where they play, so the band notes only the parts it uses.
  const drums = () => ctx.drums();
  const keys = () => band.keys(C, 'x*4').clip(0.5).gain(0.32);
  switch (mat.variant) {
    case 'stops':
      // The whole band hits together, the drums with it.
      return {
        drums: [stack(...drums()).mask(FIGURES.stops)],
        pitched: [B.struct(FIGURES.stops), band.keys(C, FIGURES.stops).clip(0.3), band.stabs(C, FIGURES.stops)],
      };
    case 'drop':
      // The drums drop out under held chords and a riser; the chorus lands on them.
      return { drums: [ctx.riser], pitched: [B.gain(0.6), band.pad(C), ctx.swell(0.16)] };
    case 'run':
      // The lead holds a chord tone, then runs up into the chorus.
      return {
        drums: drums(),
        pitched: [B, keys(), band.lead(band.line(lastBar(len, FIGURES.liftRun, FIGURES.liftHold), S, 24))],
      };
    case 'drums':
      // The drums alone, then a bass pickup into the new key.
      return { drums: drums(), pitched: [band.bass(lastBar(len, FIGURES.liftPickup, '~'), keyScale(mat.key, 2))] };
    case 'horns':
      // A rising horn line over quarter-note keys.
      return { drums: drums(), pitched: [B, keys(), band.horns(band.line(FIGURES.liftLine, S, 36))] };
  }
}
