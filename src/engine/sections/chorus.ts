// The hook, doubled an octave up if it fits; later choruses answer it
// (in its gaps every other bar, or with a held line), and the last one
// adds stabs, strings and choir, and answers in every bar.

import { ANSWER_STYLES, COMP, GROOVES, type AnswerStyle } from '../../style';
import { AnswerWriter, type Melody } from '../writers';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection, type Plan, type PlayedMaterial } from './section';
import { spans } from '../score';

export interface ChorusFields {
  /** Later choruses answer the hook. */
  answer: boolean;
  /** The last chorus has everything. */
  big: boolean;
}

export interface ChorusMaterial extends PlayedMaterial {
  melody: Melody;
  answer: Melody;
  /** How it answers the hook. */
  variant: AnswerStyle;
}

export interface Chorus extends Readonly<ChorusFields> {}

export class Chorus extends PlayedSection<ChorusMaterial> {
  static readonly id = 'chorus';
  static readonly short = 'c';
  static override readonly handsOver = true;

  readonly material: ChorusMaterial;

  constructor(plan: Plan<ChorusFields>, ctx: BuildContext) {
    super(plan);
    this.material = ctx.material(this, (rng) => {
      const { key } = ctx;
      const bars = ctx.chorusBars();
      const hook = ctx.hook();
      const variant = rng.weightedKey(ANSWER_STYLES);
      return {
        ...ctx.band(key, bars, GROOVES.chorus, rng.fork('groove')),
        melody: hook,
        answer: new AnswerWriter(key, variant, rng.fork('answer')).write(hook, bars),
        variant,
      };
    });
  }

  protected play(ctx: PlayedScoreContext): Parts {
    const { band, C, B, len } = ctx;
    const mat = this.material;
    const { answer, big } = this;
    return [
      ctx.drums(),
      B,
      band.comp(C, spans(COMP.chorus, len)),
      band.clav(C),
      band.pad(C),
      band.lead(ctx.line(mat.melody)),
      band.double(ctx.line(mat.melody), ctx.octaveUp(mat.melody)),
      answer && band.counter(ctx.line(big || mat.variant === 'line' ? mat.answer : mat.answer.alternate)),
      big && band.stabs(C),
      big && band.strings(C),
      big && band.choir(C),
    ];
  }
}
