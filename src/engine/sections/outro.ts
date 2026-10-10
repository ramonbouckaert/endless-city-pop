// A reprise of the intro's chords, quietly, or two soloists trading lines
// over a vamp.

import { FORM, OUTRO_STYLES, type OutroStyle } from '../../style';
import type { PlayedMaterial } from '../material';
import type { Melody } from '../melody';
import type { Plan } from '../plan';
import { SoloWriter, type Solo } from '../solo-line';
import type { BuildContext } from './build-context';
import { Intro } from './intro';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection } from './section';
import { SoloSection } from './solo';
import { Vamp } from './vamp';

export interface OutroFields {
  /** How it ends the song. */
  variant: OutroStyle;
}

// Two soloists (indexes into the song's) trading lines.
interface Trade {
  solo: Solo;
  soloists: readonly [number, number];
}

// A reprise plays the intro's chords (and its teaser, if it had one); a
// trade, two soloists over a vamp.
export interface OutroMaterial extends PlayedMaterial {
  melody?: Melody;
  trade?: Trade;
}

export interface Outro extends Readonly<OutroFields> {}

export class Outro extends PlayedSection<OutroMaterial> {
  static readonly id = 'outro';
  static readonly short = 'o';

  readonly material: OutroMaterial;

  constructor(plan: Plan<OutroFields>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const { groove } = OUTRO_STYLES[this.variant];
      if (this.variant === 'reprise') {
        // The intro's chords, and its teaser if it had one.
        const intro = ctx.first(Intro);
        if (!intro) throw new Error('A reprise outro needs an intro to play again');
        const { bars, melody } = intro.material;
        return { ...ctx.band(ctx.key, bars, groove, rng.fork('groove')), ...(melody ? { melody } : {}) };
      }
      // Two soloists trade lines over the vamp's changes, or a vamp of its
      // own when the song has none: the song's soloists first, if it had solos.
      const loop = ctx.plan.first(Vamp) ? ctx.vampBars() : ctx.loop(ctx.tonality.templates.vamp, rng.fork(Vamp.id));
      const bars = Array.from({ length: this.bars }, (_, i) => loop[i % loop.length]);
      const soloists = ctx.plan.ofType(SoloSection).map((s) => s.soloist);
      const [first, second] = [...new Set([...soloists, ...FORM.soloists])];
      return {
        ...ctx.band(ctx.key, bars, groove, rng.fork('groove')),
        trade: { solo: new SoloWriter(rng.fork('line')).write(bars), soloists: [first, second] },
      };
    });
  }

  protected override get label(): string {
    return `${super.label} ${this.variant}`;
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, underB } = ctx;
    const mat = this.material;
    if (mat.trade) return this.trade(ctx, mat.trade);
    return [ctx.drums(), band.softKeys(C), band.strings(C), underB, ctx.teaser(mat.melody)];
  }

  // A pared-back vamp, soft keys over light drums, while two soloists
  // trade two-bar lines: the first on bars 1-2, 5-6, ...
  private trade(ctx: PlayedScoreContext, { solo, soloists: [first, second] }: Trade): Parts {
    const { band, C, underB } = ctx;
    const line = ctx.soloLine(solo);
    const turn = (mine: number) => line.filter((n) => Math.floor(Math.floor(n.time) / 2) % 2 === mine);
    return [
      ctx.drums().postgain(0.7),
      underB,
      band.softKeysUnder(C),
      band.soloist(first, turn(0)).pan(0.4),
      band.soloist(second, turn(1)).pan(0.62),
    ];
  }
}
