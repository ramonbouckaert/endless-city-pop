// Changes as long as the section (the mode's solo changes, or one of the
// song's own progressions looped), and the line over them: the first
// solo over the band, a later one never over what the one before had (a
// bossa comp, perhaps).

import type { Program } from '../../lib/general-midi';
import type { Odds, Rng } from '../../lib/random';
import {
  ADVENTUROUS,
  COMP,
  RUN_INTO,
  SOLO_COMPS,
  SOLO_OVER,
  tonalityOf,
  type SoloComp,
  type SoloOver,
} from '../../style';
import type { Bar, Key } from '../../theory';
import type { Sounds } from '../song';
import { SoloChangesWriter, SoloWriter, type Solo } from '../writers';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection, swappedKeys, type Plan, type PlayedMaterial } from './section';
import { spans } from '../score';
import { Verse } from './verse';

export interface SoloFields {
  /** Its soloist, as an index into the song's soloists. */
  soloist: number;
}

export interface SoloMaterial extends PlayedMaterial {
  variant: SoloComp;
  /** The changes it plays over. */
  over: SoloOver;
  solo: Solo;
  /** Sounds for its keys of its own, in order of preference, if it has them (swappedKeys). */
  keys?: readonly Program[];
  /** Whether it ends with the horns running up into the next downbeat. */
  run: boolean;
}

export interface SoloSection extends Readonly<SoloFields> {}

export class SoloSection extends PlayedSection<SoloMaterial> {
  static readonly id = 'solo';
  static readonly short = 's';
  static override readonly handsOver = true;

  readonly material: SoloMaterial;

  constructor(plan: Plan<SoloFields>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const before = ctx.previous(this);
      const variant = before ? rng.weightedKey(SOLO_COMPS, before.material.variant) : 'band';
      const over = rng.fork('over').weightedKey(this.sources(ctx));
      const { key, bars } = this.changes(over, ctx, rng.fork('changes'));
      const keys = ctx.swap(rng.fork('swap'));
      return {
        ...ctx.band(key, bars, SOLO_COMPS[variant].groove, rng.fork('groove')),
        variant,
        over,
        solo: new SoloWriter(rng.fork('line')).write(bars),
        ...(keys === undefined ? {} : { keys }),
        run: rng.fork('run').chance(RUN_INTO),
      };
    });
  }

  // What it may play over: the song's verse only if it has verses.
  private sources(ctx: BuildContext): Odds<SoloOver> {
    if (ctx.plan.first(Verse)) return SOLO_OVER;
    const { verse: _, ...rest } = SOLO_OVER;
    return rest;
  }

  // Its changes, and their key: the mode's solo changes, an interlude in
  // a borrowed key, or a progression of the song's looped to its length;
  // if the loop doesn't come round whole, or the interlude's ends, its
  // last two bars lead home.
  private changes(over: SoloOver, ctx: BuildContext, rng: Rng): { key: Key; bars: Bar[] } {
    const home = ctx.key;
    if (over === 'cycle') return { key: home, bars: new SoloChangesWriter(home, rng, ctx.colour).write(this.bars) };
    const approach = () => ctx.harmonizer(rng.fork('home')).approach();
    if (over === 'interlude') {
      // A vamp of a key a bridge might go to (Stay With Me's in bIII), then home.
      const key = ctx.harmonizer(rng.fork('key')).bridgeKey(ADVENTUROUS);
      const vamp = rng.pick(tonalityOf(key.mode).templates.vamp);
      return { key, bars: [...ctx.progress(vamp, this.bars - 2, rng.fork('vamp'), { key }), ...approach()] };
    }
    const source = this.source(over, ctx);
    const looped = Array.from({ length: this.bars }, (_, b) => source[b % source.length]);
    if (this.bars % source.length === 0) return { key: home, bars: looped };
    return { key: home, bars: [...looped.slice(0, -2), ...approach()] };
  }

  // The song's progression a solo loops.
  private source(over: Exclude<SoloOver, 'cycle' | 'interlude'>, ctx: BuildContext): readonly Bar[] {
    switch (over) {
      case 'chorus':
        return ctx.chorusBars();
      case 'verse':
        return ctx.first(Verse)?.material.bars ?? ctx.chorusBars();
      case 'intro':
        return ctx.introBars().bars;
      case 'vamp':
        return ctx.vampBars();
    }
  }

  protected override get details(): string[] {
    return this.material.over === 'cycle' ? [] : [`over ${this.material.over}`];
  }

  override sounds(song: Sounds): Partial<Sounds> | undefined {
    return swappedKeys(this.material.keys, song);
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, B, len } = ctx;
    const mat = this.material;
    const bossa = mat.variant === 'bossa';
    return [
      ctx.drums(),
      B,
      bossa ? band.keysUnder(C, spans(COMP.bossa, len)) : band.keysUnder(C),
      // (No clavinet over keys swapped to one.)
      bossa ? band.strings(C) : !band.shares('keys', 'clav') && ctx.clav,
      band.soloist(this.soloist, ctx.soloLine(mat.solo, band.chordal(this.soloist))).pan(bossa ? 0.42 : 0.55),
      mat.run && ctx.runInto(),
    ];
  }
}
