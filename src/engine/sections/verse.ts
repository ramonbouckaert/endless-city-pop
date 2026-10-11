// Keys, clavinet and the lead; later verses add rhythm guitar and a pad.
// Its chords are a verse template's, the chorus's, or a two-chord vamp.

import type { Rng } from '../../lib/random';
import { GROOVES, MELODIES, THEME, VERSE, type VerseHarmony } from '../../style';
import type { Bar } from '../../theory';
import { Harmonizer, type Melody } from '../writers';
import type { NoteSpec } from '../score';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection, type Plan, type PlayedMaterial } from './section';

export interface VerseFields {
  /** A later round adds a layer. */
  later: boolean;
}

export interface VerseMaterial extends PlayedMaterial {
  /** Where its chords come from. */
  harmony: VerseHarmony;
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
      const harmony = rng.fork('source').weightedKey(VERSE.harmony);
      const eight = Verse.eight(harmony, ctx, rng.fork('harmony'));
      // A song whose verses are all sixteen bars may sing them in four-bar
      // phrases over its chords twice (never a shorter verse: it would
      // stop halfway through the material); one whose verses are all
      // seven bars drops the first.
      const verses = ctx.plan.ofType(Verse);
      const long = verses.every((v) => v.bars >= 16) && rng.fork('long').chance(THEME.longVerse);
      const short = verses.every((v) => v.bars === 7);
      const bars = long ? [...eight, ...eight] : short ? eight.slice(1) : eight;
      return {
        ...ctx.band(ctx.key, bars, GROOVES.verse, rng.fork('groove')),
        harmony,
        melody: ctx.melody(long ? MELODIES.theme : MELODIES.verse, ctx.key, bars, rng.fork('melody')),
      };
    });
  }

  // Eight bars of chords: a verse template's, the chorus's first eight,
  // or a two-chord vamp three times and the approach home.
  private static eight(harmony: VerseHarmony, ctx: BuildContext, rng: Rng): Bar[] {
    const { templates } = ctx.tonality;
    switch (harmony) {
      case 'template':
        return ctx.progress(rng.pick(templates.verse), 8, rng.fork('template'));
      case 'chorus':
        return ctx.chorusBars().slice(0, 8);
      case 'vamp':
        return [
          ...ctx.progress(rng.pick(templates.verseVamp), 6, rng.fork('vamp')),
          ...new Harmonizer(ctx.key, rng.fork('approach')).approach(),
        ];
    }
  }

  protected override get details(): string[] {
    return this.material.harmony === 'template' ? [] : [`on ${this.material.harmony}`];
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
