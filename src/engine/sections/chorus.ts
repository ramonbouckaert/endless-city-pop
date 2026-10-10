// The hook, doubled an octave up if it fits; later choruses add the
// figures that answer it, and the last one stabs, strings and choir.

import type { Rng } from '../../lib/random';
import { RHYTHM } from '../../style';
import { COMP, spans } from '../figures';
import { AnswerWriter } from '../melody';
import type { MaterialOf } from '../material';
import type { Parts, PlayedScoreContext, WriteContext } from './context';
import { SectionBase, type Placement } from './section';

export class Chorus extends SectionBase<'chorus'> {
  /** Later choruses answer the hook. */
  readonly answer: boolean;
  /** The last chorus has everything. */
  readonly big: boolean;

  constructor(bars: number, { answer, big, ...placement }: { answer: boolean; big: boolean } & Placement) {
    super('chorus', bars, placement);
    this.answer = answer;
    this.big = big;
  }

  protected compose(ctx: WriteContext, rng: Rng): MaterialOf<'chorus'> {
    const { key } = ctx;
    const bars = ctx.chorusBars();
    const hook = ctx.hook();
    return {
      ...ctx.band('chorus', key, bars, RHYTHM.chorus, rng.fork('groove')),
      melody: hook,
      answer: new AnswerWriter(key, rng.fork('answer')).write(hook, bars),
    };
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
