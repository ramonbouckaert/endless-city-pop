// A reprise of the intro's chords, quietly, or two soloists trading lines
// over a vamp.

import { FORM, RHYTHM, type OutroStyle } from '../../style';
import { SoloWriter } from '../melody';
import type { MaterialOf } from '../material';
import type { SectionFields, SectionPlan } from '../plan';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection } from './section';

export class Outro extends PlayedSection<'outro'> implements Readonly<SectionFields['outro']> {
  readonly variant: OutroStyle;
  readonly material: MaterialOf<'outro'>;

  constructor(plan: SectionPlan<'outro'>, ctx: BuildContext) {
    super(plan);
    this.variant = plan.variant;
    this.material = ctx.material(this, (rng) => {
      const groove = RHYTHM.outro[this.variant];
      if (this.variant === 'reprise') {
        // The intro's chords, and its teaser if it had one.
        const intro = ctx.plan.first('intro');
        if (!intro) throw new Error('A reprise outro needs an intro to play again');
        const { bars, melody } = ctx.section(intro).material;
        return {
          ...ctx.band('outro', ctx.key, bars, groove, rng.fork('groove')),
          variant: 'reprise',
          ...(melody ? { melody } : {}),
        };
      }
      // Two soloists trade lines over the vamp's changes, or a vamp of its
      // own when the song has none: the song's soloists first, if it had solos.
      const loop = ctx.plan.first('vamp') ? ctx.vampBars() : ctx.loop('vamp', rng.fork('vamp'));
      const bars = Array.from({ length: this.bars }, (_, i) => loop[i % loop.length]);
      const [first, second] = [...new Set([...ctx.plan.soloists, ...FORM.soloists])];
      return {
        ...ctx.band('outro', ctx.key, bars, groove, rng.fork('groove')),
        variant: 'trade',
        solo: new SoloWriter(rng.fork('line')).write(bars),
        soloists: [first, second],
      };
    });
  }

  protected override get label(): string {
    return `outro ${this.variant}`;
  }

  protected play(ctx: PlayedScoreContext<'outro'>): Parts {
    const { band, C, underB } = ctx;
    const mat = this.material;
    if (mat.variant === 'trade') return this.trade(ctx, mat);
    return { drums: ctx.drums(), pitched: [band.softKeys(C), band.strings(C), underB, ctx.teaser(mat.melody)] };
  }

  // A pared-back vamp, soft keys over light drums, while two soloists
  // trade two-bar lines: the first on bars 1-2, 5-6, ...
  private trade(
    ctx: PlayedScoreContext<'outro'>,
    { solo, soloists: [first, second] }: Extract<MaterialOf<'outro'>, { variant: 'trade' }>,
  ): Parts {
    const { band, C, underB } = ctx;
    const line = ctx.soloLine(solo);
    const turn = (mine: number) => line.filter((n) => Math.floor(Math.floor(n.time) / 2) % 2 === mine);
    return {
      drums: ctx.drums().map((p) => p.postgain(0.7)),
      pitched: [
        underB,
        band.softKeysUnder(C),
        band.soloist(first, turn(0)).pan(0.4),
        band.soloist(second, turn(1)).pan(0.62),
      ],
    };
  }
}
