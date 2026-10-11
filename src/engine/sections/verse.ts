// Keys, clavinet and the lead; later verses add rhythm guitar and a pad.

import { GROOVES, MELODIES, THEME } from '../../style';
import type { Melody } from '../writers';
import type { NoteSpec } from '../score';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection, type Plan, type PlayedMaterial } from './section';

export interface VerseFields {
  /** A later round adds a layer. */
  later: boolean;
}

export interface VerseMaterial extends PlayedMaterial {
  melody: Melody;
}

export interface Verse extends Readonly<VerseFields> {}

export class Verse extends PlayedSection<VerseMaterial> {
  static readonly id = 'verse';
  static readonly short = 'v';

  readonly material: VerseMaterial;

  constructor(plan: Plan<VerseFields>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const eight = ctx.progress(rng.pick(ctx.tonality.templates.verse), 8, rng.fork('harmony'));
      // A song whose verses are all sixteen bars may sing them in four-bar
      // phrases over its chords twice (never a shorter verse: it would
      // stop halfway through the material).
      const long = ctx.plan.ofType(Verse).every((v) => v.bars >= 16) && rng.fork('long').chance(THEME.longVerse);
      const bars = long ? [...eight, ...eight] : eight;
      return {
        ...ctx.band(ctx.key, bars, GROOVES.verse, rng.fork('groove')),
        melody: ctx.melody(long ? MELODIES.theme : MELODIES.verse, ctx.key, bars, rng.fork('melody')),
      };
    });
  }

  override melodyOver(ctx: PlayedScoreContext): NoteSpec[] | undefined {
    return ctx.line(this.material.melody);
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, B } = ctx;
    const { later } = this;
    return [
      ctx.drums(),
      B,
      band.keys(C),
      ctx.clav,
      band.lead(ctx.line(this.material.melody)),
      later && band.scratch(C),
      later && band.pad(C),
    ];
  }
}
