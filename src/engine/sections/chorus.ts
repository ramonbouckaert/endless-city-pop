// The hook, doubled an octave up if it fits; later choruses add the
// figures that answer it, and the last one stabs, strings and choir.

import { COMP, RHYTHM } from '../../style';
import { spans } from '../figures';
import type { MaterialOf } from '../material';
import { AnswerWriter } from '../melody';
import type { SectionFields, SectionPlan } from '../plan';
import type { BuildContext } from './build-context';
import type { Parts, PlayedScoreContext } from './score-context';
import { PlayedSection } from './section';

export class Chorus extends PlayedSection<'chorus'> implements Readonly<SectionFields['chorus']> {
  readonly answer: boolean;
  readonly big: boolean;
  readonly material: MaterialOf<'chorus'>;

  constructor(plan: SectionPlan<'chorus'>, ctx: BuildContext) {
    super(plan);
    this.answer = plan.answer;
    this.big = plan.big;
    this.material = ctx.material(this, (rng) => {
      const { key } = ctx;
      const bars = ctx.chorusBars();
      const hook = ctx.hook();
      return {
        ...ctx.band('chorus', key, bars, RHYTHM.chorus, rng.fork('groove')),
        melody: hook,
        answer: new AnswerWriter(key, rng.fork('answer')).write(hook, bars),
      };
    });
  }

  protected play(ctx: PlayedScoreContext<'chorus'>): Parts {
    const { band, C, B, len } = ctx;
    const mat = this.material;
    const { answer, big } = this;
    return {
      drums: ctx.drums(),
      pitched: [
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
      ],
    };
  }
}
