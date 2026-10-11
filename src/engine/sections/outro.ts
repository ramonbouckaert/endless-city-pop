// A reprise of the intro's chords, quietly; two soloists trading lines
// over a vamp; a soloist over a coda that never lands; or the verse's
// chords looping under a new hook.

import { FORM, MELODIES, OUTRO_STYLES, type OutroStyle } from '../../style';
import type { Bar } from '../../theory';
import { SoloWriter, type Melody, type Solo } from '../writers';
import type { NoteSpec } from '../score';
import type { BuildContext } from './build-context';
import { Intro } from './intro';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection, type Plan, type PlayedMaterial } from './section';
import { SoloSection } from './solo';
import { Vamp } from './vamp';
import { Verse } from './verse';

export interface OutroFields {
  /** How it ends the song. */
  variant: OutroStyle;
}

// Two soloists (indexes into the song's) trading lines.
interface Trade {
  solo: Solo;
  soloists: readonly [number, number];
}

// A soloist (an index into the song's) playing on over a coda.
interface AdLib {
  solo: Solo;
  soloist: number;
}

// A reprise plays the intro's chords (and its teaser, if it had one); a
// trade, two soloists over a vamp; a coda, a soloist over the approach
// home; a loop, a new hook over the verse's chords.
export interface OutroMaterial extends PlayedMaterial {
  melody?: Melody;
  trade?: Trade;
  adLib?: AdLib;
  hook?: Melody;
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
        const { key, bars, melody } = intro.material;
        return { ...ctx.band(key, bars, groove, rng.fork('groove')), ...(melody ? { melody } : {}) };
      }
      // The song's soloists first, if it had solos.
      const soloists = ctx.plan.ofType(SoloSection).map((s) => s.soloist);
      const [first, second] = [...new Set([...soloists, ...FORM.soloists])];
      if (this.variant === 'coda') {
        // The approach home, over and over, never landing.
        const bars = this.looped(ctx.harmonizer(rng.fork('harmony')).approach());
        const solo = new SoloWriter(rng.fork('line')).write(bars);
        return { ...ctx.band(ctx.key, bars, groove, rng.fork('groove')), adLib: { solo, soloist: first } };
      }
      if (this.variant === 'loop') {
        // The verse's chords (the chorus's, in a song without verses), and a new hook over them.
        const verse = ctx.first(Verse)?.material.bars ?? ctx.chorusBars().slice(0, 8);
        const bars = this.looped(verse.slice(0, 8));
        const hook = ctx.melody(MELODIES.chorus, ctx.key, bars.slice(0, 8), rng.fork('hook'));
        return { ...ctx.band(ctx.key, bars, groove, rng.fork('groove')), hook };
      }
      // Two soloists trade lines over the vamp's changes, or a vamp of its
      // own when the song has none.
      const loop = ctx.plan.first(Vamp) ? ctx.vampBars() : ctx.loop(ctx.tonality.templates.vamp, rng.fork(Vamp.id));
      const bars = this.looped(loop);
      return {
        ...ctx.band(ctx.key, bars, groove, rng.fork('groove')),
        trade: { solo: new SoloWriter(rng.fork('line')).write(bars), soloists: [first, second] },
      };
    });
  }

  // Some bars looped to its length.
  private looped(loop: readonly Bar[]): Bar[] {
    return Array.from({ length: this.bars }, (_, i) => loop[i % loop.length]);
  }

  protected override get label(): string {
    return `${super.label} ${this.variant}`;
  }

  override melodyOver(ctx: PlayedScoreContext): NoteSpec[] | undefined {
    const mat = this.material;
    if (mat.hook) return ctx.line(mat.hook);
    return mat.trade || mat.adLib ? undefined : ctx.teaserLine(mat.melody);
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, B, underB } = ctx;
    const mat = this.material;
    if (mat.trade) return this.trade(ctx, mat.trade);
    if (mat.adLib)
      return [
        ctx.drums(),
        B,
        band.keysUnder(C),
        ctx.clav,
        band.pad(C),
        band.soloist(mat.adLib.soloist, ctx.soloLine(mat.adLib.solo, band.chordal(mat.adLib.soloist))).pan(0.55),
      ];
    if (mat.hook) {
      const line = ctx.line(mat.hook);
      return [
        ctx.drums(),
        B,
        band.keysUnder(C),
        ctx.clav,
        band.pad(C),
        band.lead(line),
        band.double(line, ctx.octaveUp(mat.hook)),
      ];
    }
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
