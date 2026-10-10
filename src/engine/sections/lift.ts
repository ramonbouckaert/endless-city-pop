// A turnaround into the lifted key, never played the way the lift before
// it was, leading into the next chorus.

import { LIFT_STYLES, RHYTHM } from '../../style';
import { FIGURES, lastBar, RHYTHMS, spans, timed } from '../figures';
import { Harmonizer } from '../harmony';
import { Part, within } from '../score';
import type { MaterialOf } from '../material';
import type { SectionFields, SectionPlan } from '../plan';
import type { Parts, PlayedScoreContext, BuildContext } from './context';
import { Section } from './section';

export class Lift extends Section<'lift'> implements Readonly<SectionFields['lift']> {
  readonly liftTo: number;
  readonly turnaround: string;
  readonly material: MaterialOf<'lift'>;

  constructor(plan: SectionPlan<'lift'>, ctx: BuildContext) {
    super(plan);
    this.liftTo = plan.liftTo;
    this.turnaround = plan.turnaround;
    this.material = ctx.material(this, (rng) => {
      const { turnaround } = this;
      const key = ctx.key.transpose(this.liftTo);
      const bars = new Harmonizer(key, rng.fork('harmony')).turnaround(turnaround);
      const before = ctx.plan.previous(plan);
      const variant = rng.weightedKey(LIFT_STYLES, before && ctx.section(before).material.variant);
      return { ...ctx.band('lift', key, bars, RHYTHM.lift, rng.fork('groove')), turnaround, variant };
    });
  }

  override describe(): string {
    return `lift (to +${this.liftTo}, ${this.turnaround}) ${this.bars}`;
  }

  play(ctx: PlayedScoreContext<'lift'>): Parts {
    const { band, C, B, len } = ctx;
    const mat = this.material;
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
          pitched: [
            B,
            keys(),
            band.lead(ctx.onChords(timed(lastBar(len, FIGURES.liftRun, FIGURES.liftHold), len), 24)),
          ],
        };
      case 'drums': {
        // The drums alone, then a bass pickup into the new key.
        const root = 36 + mat.key.tonic; // the key's tonic in octave 2
        return { drums: drums(), pitched: [ctx.pickup((degree) => root + mat.key.scale.semis(degree))] };
      }
      case 'horns':
        // A rising horn line over quarter-note keys.
        return { drums: drums(), pitched: [B, keys(), band.horns(ctx.onChords(timed(FIGURES.liftLine, len), 36))] };
    }
  }
}
