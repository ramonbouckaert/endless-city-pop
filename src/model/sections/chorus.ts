import type { Rng } from '../../lib/random';
import { RHYTHM } from '../../style';
import type { MaterialOf } from '../material';
import type { SectionOf } from '../section';
import type { WriteContext } from './context';

// The hook, and the figures that answer it in later choruses.
export function chorus(_sec: SectionOf<'chorus'>, ctx: WriteContext, rng: Rng): MaterialOf<'chorus'> {
  const { key } = ctx;
  const bars = ctx.shared.chorusBars();
  const hook = ctx.shared.hook();
  return {
    ...ctx.band('chorus', key, bars, RHYTHM.chorus, rng),
    melody: hook,
    answer: hook.answer(bars, key, rng.fork('answer')),
  };
}
