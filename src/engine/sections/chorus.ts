// The hook, doubled an octave up if it fits; later choruses add the
// figures that answer it, and the last one stabs, strings and choir.

import { COMP, GROOVES } from '../../style';
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
      return {
        ...ctx.band(key, bars, GROOVES.chorus, rng.fork('groove')),
        melody: hook,
        answer: new AnswerWriter(key, rng.fork('answer')).write(hook, bars),
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
      answer && band.counter(ctx.line(mat.answer)),
      big && band.stabs(C),
      big && band.strings(C),
      big && band.choir(C),
    ];
  }
}
