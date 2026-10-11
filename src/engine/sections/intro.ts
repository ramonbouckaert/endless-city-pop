// The intro's chords in one of its textures, with the hook as a teaser,
// or perhaps a riff of its own; the teaser (if any) on bells over the top.
// A free intro, before the intro in time, plays the hook's chords out of
// tempo (rubato) under its teaser.

import { INTRO, INTRO_TEXTURES, MELODIES, RUBATO, RUN_INTO, type IntroHarmony, type IntroTexture } from '../../style';
import type { Melody } from '../writers';
import type { NoteSpec, Part } from '../score';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection, type Plan, type PlayedMaterial, type TempoMark } from './section';

export interface IntroMaterial extends PlayedMaterial {
  harmony: IntroHarmony;
  variant: IntroTexture;
  melody?: Melody;
  /** Whether it ends with the horns running up into the next downbeat. */
  run: boolean;
}

export interface IntroFields {
  /** Whether it is a free intro, out of tempo, before the intro in time (a part of its own: FREE). */
  free?: boolean;
}

/** The part of a free intro. */
export const FREE = 'intro:free';

export interface Intro extends Readonly<IntroFields> {}

export class Intro extends PlayedSection<IntroMaterial> {
  static readonly id = 'intro';
  static readonly short = 'i';

  readonly material: IntroMaterial;

  constructor(plan: Plan<IntroFields>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      if (this.free) {
        // The hook's chords, rubato, the hook's first bars as a teaser.
        const bars = ctx.chorusBars().slice(0, this.bars);
        return {
          ...ctx.band(ctx.chorusKey(), bars, INTRO_TEXTURES.rubato.groove, rng.fork('groove')),
          harmony: 'hook',
          variant: 'rubato',
          melody: ctx.hook().take(this.bars),
          run: false,
        };
      }
      const { harmony, bars } = ctx.introBars();
      // (After a free intro, never out of tempo again.)
      const variant = rng.weightedKey(INTRO_TEXTURES, ctx.plan.first(Intro)?.free ? 'rubato' : undefined);
      let melody: Melody | undefined;
      if (harmony === 'hook') melody = ctx.hook().take(4);
      else if (harmony === 'template' && rng.chance(INTRO.melodyChance))
        melody = ctx.melody(MELODIES.riff, ctx.key, bars, rng.fork('melody'));
      // Playing the hook, it is in the chorus's key.
      const key = harmony === 'hook' ? ctx.chorusKey() : ctx.key;
      return {
        ...ctx.band(key, bars, INTRO_TEXTURES[variant].groove, rng.fork('groove')),
        harmony,
        variant,
        ...(melody ? { melody } : {}),
        run: rng.fork('run').chance(RUN_INTO),
      };
    });
  }

  // Rubato, out of tempo: each bar slower than the song, slowing into its
  // last beat, the last bar's chord held long; then the song's tempo.
  override get tempo(): readonly TempoMark[] {
    if (this.material.variant !== 'rubato') return super.tempo;
    const bars = Array.from({ length: this.bars - 1 }, (_, b) => [
      { at: b, scale: RUBATO.bar },
      { at: b + 0.75, scale: RUBATO.beat },
    ]).flat();
    return [...bars, { at: this.bars - 1, scale: RUBATO.hold }, { at: this.bars, scale: 1 }];
  }

  protected override get details(): string[] {
    return this.free ? ['free'] : [];
  }

  override melodyOver(ctx: PlayedScoreContext): NoteSpec[] | undefined {
    // The fanfare's horns play it as written; the bells, the teaser.
    const { melody, variant } = this.material;
    if (variant === 'ostinato') return undefined;
    return melody && (variant === 'fanfare' ? ctx.line(melody) : ctx.teaserLine(melody));
  }

  protected play(ctx: PlayedScoreContext): Parts {
    return [...this.texture(ctx), this.material.run && ctx.runInto()];
  }

  // The intro's texture.
  private texture(ctx: PlayedScoreContext): Parts {
    const { band, C, B, underB, len } = ctx;
    const mat = this.material;
    const drums = ctx.drums();
    const halfway = (p: Part) => p.mask(ctx.from(len / 2));
    switch (mat.variant) {
      case 'arp':
        // A keyboard arpeggio over a pad; bass and drums join halfway.
        return [halfway(drums), band.arp(C), band.pad(C), halfway(underB), ctx.teaser(mat.melody)];
      case 'drumsFirst':
        // The drums alone, then the band in halfway on a crash.
        return [
          drums,
          band.crash(len / 2),
          halfway(B),
          halfway(band.keysUnder(C)),
          halfway(ctx.clav),
          ctx.teaser(mat.melody),
        ];
      case 'fanfare':
        // The band hits together, horns playing the teaser over it, then
        // grooves in the last bar.
        return [...ctx.stopTime(drums), mat.melody && band.horns(ctx.line(mat.melody))];
      case 'keys':
        return [halfway(drums), band.keys(C).room(0.35), halfway(underB), ctx.teaser(mat.melody)];
      case 'groove':
        return [drums, B, band.keysUnder(C), ctx.clav, ctx.teaser(mat.melody)];
      case 'bassFirst':
        return [drums, B, halfway(band.softKeys(C)), halfway(band.pad(C)), ctx.teaser(mat.melody)];
      case 'pads':
        return [drums, band.softKeys(C), band.strings(C), underB, ctx.teaser(mat.melody)];
      case 'rubato':
        // Keys and a pad alone, the teaser over them, the last chord held.
        return [band.softKeys(C), band.pad(C), ctx.teaser(mat.melody)];
      case 'ostinato': {
        // Bells round the chords in sixteenths over swelling strings, hand
        // percussion coming in one at a time, and the band in for the last
        // bar, into its fill. (The bells have no room for a teaser.)
        const last = (p: Part) => p.mask(ctx.from(len - 1));
        return [last(drums), band.ostinato(C), ctx.swell(0.12), ctx.layers(), last(underB)];
      }
    }
  }
}
