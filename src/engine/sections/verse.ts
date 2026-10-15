// Keys, clavinet and the lead, later verses adding rhythm guitar and a
// pad; or sparse; or the band coming in through it; or (leaning towards
// a ballad) the keys alone under the lead. Its chords are a verse
// template's, the chorus's (in a song with one), a two-chord vamp, or (in
// a mode that has them) a loop of two chords held two bars each.

import { only, type Rng } from '../../lib/random';
import { MELODIES, THEME, VERSE, VERSE_TEXTURES, type VerseHarmony, type VerseTexture } from '../../style';
import type { Bar } from '../../theory';
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
  /** Where its chords come from. */
  harmony: VerseHarmony;
  /** How it is played. */
  variant: VerseTexture;
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
      // (The chorus's chords only in a song with a chorus; a loop only in a mode with loops.)
      const sources = only(
        VERSE.harmony,
        (source) => (source !== 'chorus' || ctx.choruses) && (source !== 'loop' || ctx.tonality.verseLoops.length > 0),
      );
      const harmony = rng.fork('source').weightedKey(sources);
      const eight = Verse.eight(harmony, ctx, rng.fork('harmony'));
      // A song whose verses are all sixteen bars may sing them in four-bar
      // phrases over its chords twice (never a shorter verse: it would
      // stop halfway through the material); one whose verses are all
      // seven bars drops the first.
      const verses = ctx.plan.ofType(Verse);
      const long = verses.every((v) => v.bars >= 16) && rng.fork('long').chance(THEME.longVerse);
      const fitted = verses.every((v) => v.bars === 7) ? eight.slice(1) : eight;
      const bars = long ? [...eight, ...eight] : fitted;
      const variant = Verse.texture(ctx.ballad, rng.fork('texture'));
      return {
        ...ctx.band(ctx.key, bars, VERSE_TEXTURES[variant].groove, rng.fork('groove')),
        harmony,
        variant,
        melody: ctx.melody(long ? MELODIES.theme : MELODIES.verse, ctx.key, bars, rng.fork('melody')),
      };
    });
  }

  // How it is played: the keys alone the likelier, the further the song
  // leans towards a ballad (`ballad`), and never in a song that doesn't.
  private static texture(ballad: number, rng: Rng): VerseTexture {
    const { alone } = VERSE_TEXTURES;
    return rng.weightedKey({ ...VERSE_TEXTURES, alone: { ...alone, weight: alone.weight * ballad } });
  }

  // Eight bars of chords: a verse template's, the chorus's first eight,
  // a two-chord vamp three times and the approach home, or a loop of two
  // chords held two bars each.
  private static eight(harmony: VerseHarmony, ctx: BuildContext, rng: Rng): Bar[] {
    const { templates } = ctx.tonality;
    switch (harmony) {
      case 'template':
        return ctx.progress(rng.pick(templates.verse), 8, rng.fork('template'), { paired: true });
      case 'chorus':
        return ctx.chorusBars().slice(0, 8);
      case 'vamp':
        return [
          ...ctx.progress(rng.pick(templates.verseVamp), 6, rng.fork('vamp')),
          ...ctx.harmonizer(rng.fork('approach')).approach(),
        ];
      case 'loop':
        return ctx.progress(rng.pick(ctx.tonality.verseLoops), 8, rng.fork('loop'));
    }
  }

  protected override get details(): string[] {
    const { harmony, variant } = this.material;
    return [variant === 'full' ? '' : variant, harmony === 'template' ? '' : `on ${harmony}`].filter(Boolean);
  }

  override melodyOver(ctx: PlayedScoreContext): NoteSpec[] | undefined {
    return ctx.line(this.material.melody);
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, B, underB, len } = ctx;
    const { later } = this;
    const lead = band.lead(ctx.line(this.material.melody));
    // (The song's own guitar figure, if it has one, plays in place of the scratch.)
    const guitar = ctx.signature ?? (later && band.scratch(C));
    switch (this.material.variant) {
      case 'full':
        return [ctx.drums(), B, band.keys(C), ctx.clav, lead, guitar, later && band.pad(C)];
      case 'sparse':
        return [ctx.drums(), B, band.softKeysUnder(C), lead, later && band.pad(C)];
      case 'alone':
        // The keys alone under the lead; later, the bass and a pad under them.
        return [band.keysUnder(C), lead, later && underB, later && band.pad(C)];
      case 'build': {
        // Kick, bass and keys; the hats and clavinet a quarter in, the
        // backbeat and guitar halfway, the pad for the last quarter.
        const from = (share: number) => ctx.from(Math.floor(len * share));
        const drums = ctx.drums((role) => {
          if (role === 'hat' || role === 'perc') return from(0.25);
          if (role === 'snare' || role === 'ghost') return from(0.5);
          return undefined;
        });
        return [
          drums,
          B,
          band.keys(C),
          ctx.clav.mask(from(0.25)),
          lead,
          guitar && guitar.mask(from(0.5)),
          band.pad(C).mask(from(0.75)),
        ];
      }
    }
  }
}
