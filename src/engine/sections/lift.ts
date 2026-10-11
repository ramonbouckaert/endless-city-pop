// A turnaround into the lifted key, never played the way the lift before
// it was, leading into the next chorus. Like the chorus, it is written in
// the song's key and played shifted up to the new one.

import { FIGURES, GROOVES, LIFT_STYLES, RHYTHMS, type LiftStyle } from '../../style';
import type { Rng } from '../../lib/random';
import { Chord, type Bar } from '../../theory';

import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection, type Plan, type PlayedMaterial } from './section';
import { lastBar, spans, timed } from '../score';

export interface LiftFields {
  /** The turnaround it takes into its key (a name in the tonality's, or OWN). */
  turnaround: string;
}

/** The turnaround that bends the chorus's own last two bars onto the new key's V. */
export const OWN = 'own';

// A turnaround into the chorus after it, whose first chord (`into`) a
// bass pickup may lead to.
export interface LiftMaterial extends PlayedMaterial {
  variant: LiftStyle;
  into: Chord;
}

export interface Lift extends Readonly<LiftFields> {}

export class Lift extends PlayedSection<LiftMaterial> {
  static readonly id = 'lift';
  static readonly short = 'l';

  readonly material: LiftMaterial;

  constructor(plan: Plan<LiftFields>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const bars =
        this.turnaround === OWN
          ? this.own(ctx, rng.fork('own'))
          : ctx.harmonizer(rng.fork('harmony')).turnaround(this.turnaround);
      const variant = rng.weightedKey(LIFT_STYLES, ctx.previous(this)?.material.variant);
      return {
        ...ctx.band(ctx.key, bars, GROOVES.lift, rng.fork('groove')),
        variant,
        into: ctx.firstChordAfter(this).chord,
      };
    });
  }

  // The chorus's last two bars, the first still in the key it lifts from
  // (written a step down, as the lift plays in its new key), the last
  // chord bent onto the new key's V.
  private own(ctx: BuildContext, rng: Rng): Bar[] {
    const step = this.shift - (ctx.plan.before(this.plan)?.shift ?? 0);
    const down = (bar: Bar) => bar.map((c) => c.transpose(-step));
    const [first, second] = ctx.chorusBars().slice(-2);
    const v = new Chord(ctx.key.tonic + 7, rng.pick(['13', '7alt', '9sus']));
    const bars = [down(first), [...down(second).slice(0, -1), v]];
    return Chord.inBars(Chord.fitScales(bars.flat(), ctx.key), bars);
  }

  protected override get details(): string[] {
    return [this.turnaround];
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, B, underB, len } = ctx;
    const mat = this.material;
    const comp = () => band.comp(C, spans(RHYTHMS.quarters, len));
    switch (mat.variant) {
      case 'stops':
        // The whole band hits together, the drums with it.
        return ctx.stopTime(ctx.drums(), false);
      case 'drop':
        // The drums drop out under held chords and a riser; the chorus lands on them.
        return [ctx.riser, underB, band.pad(C), ctx.swell(0.16)];
      case 'run':
        // The lead holds a chord tone, then runs up into the chorus.
        return [
          ctx.drums(),
          B,
          comp(),
          band.lead(ctx.onChords(timed(lastBar(len, FIGURES.liftRun, FIGURES.liftHold), len), 24)),
        ];
      case 'drums':
        // The drums alone, then a bass pickup into the chorus.
        return [ctx.drums(), ctx.pickupInto(mat.into)];
      case 'horns':
        // A rising horn line over quarter-note keys.
        return [ctx.drums(), B, comp(), band.horns(ctx.onChords(timed(FIGURES.liftLine, len), 36))];
    }
  }
}
