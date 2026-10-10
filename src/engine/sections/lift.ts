// A turnaround into the lifted key, never played the way the lift before
// it was, leading into the next chorus. Like the chorus, it is written in
// the song's key and played shifted up to the new one.

import { FIGURES, LIFT_STYLES, RHYTHM, RHYTHMS } from '../../style';
import { lastBar, spans, timed } from '../figures';
import { Harmonizer } from '../harmony';
import type { MaterialOf } from '../material';
import type { SectionFields, SectionPlan } from '../plan';
import { Part, within } from '../score';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection } from './section';

export class Lift extends PlayedSection<'lift'> implements Readonly<SectionFields['lift']> {
  readonly turnaround: string;
  readonly material: MaterialOf<'lift'>;

  constructor(plan: SectionPlan<'lift'>, ctx: BuildContext) {
    super(plan);
    this.turnaround = plan.turnaround;
    this.material = ctx.material(this, (rng) => {
      const { turnaround } = this;
      const bars = new Harmonizer(ctx.key, rng.fork('harmony')).turnaround(turnaround);
      const before = ctx.plan.previous(plan);
      const variant = rng.weightedKey(LIFT_STYLES, before && ctx.section(before).material.variant);
      const next = ctx.plan.next(plan);
      const into = next && ctx.section(next).material;
      if (!into || !('bars' in into)) throw new Error(`A lift can't lead into ${next?.type ?? 'nothing'}`);
      return {
        ...ctx.band('lift', ctx.key, bars, RHYTHM.lift, rng.fork('groove')),
        turnaround,
        variant,
        into: into.bars[0][0],
      };
    });
  }

  protected override get details(): string[] {
    return [this.turnaround];
  }

  protected play(ctx: PlayedScoreContext<'lift'>): Parts {
    const { band, C, B, underB, len } = ctx;
    const mat = this.material;
    const comp = () => band.comp(C, spans(RHYTHMS.quarters, len));
    switch (mat.variant) {
      case 'stops': {
        // The whole band hits together, the drums with it.
        const stops = spans(RHYTHMS.stops, len);
        return {
          drums: [Part.stack(...ctx.drums()).mask(within(stops))],
          pitched: [B.struct(stops), band.keys(C, stops).clip(0.3), band.stabs(C, stops)],
        };
      }
      case 'drop':
        // The drums drop out under held chords and a riser; the chorus lands on them.
        return { drums: [ctx.riser], pitched: [underB, band.pad(C), ctx.swell(0.16)] };
      case 'run':
        // The lead holds a chord tone, then runs up into the chorus.
        return {
          drums: ctx.drums(),
          pitched: [
            B,
            comp(),
            band.lead(ctx.onChords(timed(lastBar(len, FIGURES.liftRun, FIGURES.liftHold), len), 24)),
          ],
        };
      case 'drums':
        // The drums alone, then a bass pickup into the chorus.
        return { drums: ctx.drums(), pitched: [ctx.pickupInto(mat.into)] };
      case 'horns':
        // A rising horn line over quarter-note keys.
        return { drums: ctx.drums(), pitched: [B, comp(), band.horns(ctx.onChords(timed(FIGURES.liftLine, len), 36))] };
    }
  }
}
