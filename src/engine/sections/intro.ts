// The intro's chords in one of its textures, with the hook as a teaser,
// or perhaps a riff of its own; the teaser (if any) on bells over the top.

import { INTRO, INTRO_TEXTURES, MELODIES, RUN_INTO, type IntroHarmony, type IntroTexture } from '../../style';
import type { Melody } from '../writers';
import type { NoteSpec, Part } from '../score';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection, type Plan, type PlayedMaterial } from './section';

export interface IntroMaterial extends PlayedMaterial {
  harmony: IntroHarmony;
  variant: IntroTexture;
  melody?: Melody;
  /** Whether it ends with the horns running up into the next downbeat. */
  run: boolean;
}

export class Intro extends PlayedSection<IntroMaterial> {
  static readonly id = 'intro';
  static readonly short = 'i';

  readonly material: IntroMaterial;

  constructor(plan: Plan, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const { harmony, bars } = ctx.introBars();
      const variant = rng.weightedKey(INTRO_TEXTURES);
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
