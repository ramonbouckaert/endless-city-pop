// The hook, doubled an octave up if it fits; later choruses add the
// figures that answer it, and the last one stabs, strings and choir.

import { RHYTHM } from '../../style';
import { COMP, spans } from '../figures';
import { AnswerWriter } from '../melody';
import type { MaterialOf } from '../material';
import type { SectionFields, SectionPlan } from '../plan';
import type { Parts, PlayedScoreContext, BuildContext } from './context';
import { Section } from './section';

export class Chorus extends Section<'chorus'> implements Readonly<SectionFields['chorus']> {
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

  play(ctx: PlayedScoreContext<'chorus'>): Parts {
    const { band, C, B, len } = ctx;
    const mat = this.material;
    const { answer, big } = this;
    return {
      drums: ctx.drums(),
      pitched: [
        B,
        band.keys(C, spans(COMP.chorus, len)).clip(0.5).gain(0.28),
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
