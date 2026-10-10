import type { Rng } from '../../lib/random';
import { RHYTHM } from '../../style';
import type { MaterialOf } from '../material';
import { AnswerWriter } from '../melody';
import type { SectionOf } from '../section';
import type { WriteContext } from './context';

// The hook, and the figures that answer it in later choruses.
export function chorus(_sec: SectionOf<'chorus'>, ctx: WriteContext, rng: Rng): MaterialOf<'chorus'> {
  const { key } = ctx;
  const bars = ctx.shared.chorusBars();
  const hook = ctx.shared.hook();
  return {
    ...ctx.band('chorus', key, bars, RHYTHM.chorus, rng.fork('groove')),
    melody: hook,
    answer: new AnswerWriter(key, rng.fork('answer')).write(hook, bars),
  };
}
