import { FIGURES, lastBar, RHYTHMS, spans, timed } from '../figures';
import { Part, within } from '../score';
import type { Parts, PlayedScoreContext } from './context';

// A turnaround into the next chorus's key, played in the lift's style.
export function lift(ctx: PlayedScoreContext<'lift'>): Parts {
  const { band, C, B, len, mat } = ctx;
  // Built only where they play, so the band notes only the parts it uses.
  const drums = () => ctx.drums();
  const keys = () => band.keys(C, spans(RHYTHMS.quarters, len)).clip(0.5).gain(0.32);
  switch (mat.variant) {
    case 'stops': {
      // The whole band hits together, the drums with it.
      const stops = spans(RHYTHMS.stops, len);
      return {
        drums: [Part.stack(...drums()).mask(within(stops))],
        pitched: [B.struct(stops), band.keys(C, stops).clip(0.3), band.stabs(C, stops)],
      };
    }
    case 'drop':
      // The drums drop out under held chords and a riser; the chorus lands on them.
      return { drums: [ctx.riser], pitched: [B.gain(0.6), band.pad(C), ctx.swell(0.16)] };
    case 'run':
      // The lead holds a chord tone, then runs up into the chorus.
      return {
        drums: drums(),
        pitched: [B, keys(), band.lead(ctx.onChords(timed(lastBar(len, FIGURES.liftRun, FIGURES.liftHold), len), 24))],
      };
    case 'drums': {
      // The drums alone, then a bass pickup into the new key.
      const root = 36 + mat.key.tonic; // the key's tonic in octave 2
      const pickup = timed(lastBar(len, FIGURES.pickup), len).map(({ time, dur, value }) => ({
        time,
        dur,
        note: root + mat.key.scale.semis(value),
      }));
      return { drums: drums(), pitched: [band.bass(pickup)] };
    }
    case 'horns':
      // A rising horn line over quarter-note keys.
      return { drums: drums(), pitched: [B, keys(), band.horns(ctx.onChords(timed(FIGURES.liftLine, len), 36))] };
  }
}
