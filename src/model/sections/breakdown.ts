import type { Rng } from '../../lib/random';
import { RHYTHM } from '../../style';
import type { MaterialOf } from '../material';
import type { SectionOf } from '../section';
import type { WriteContext } from './context';

// The hook over the chorus's first bars.
export function breakdown(sec: SectionOf<'breakdown'>, ctx: WriteContext, rng: Rng): MaterialOf<'breakdown'> {
  const bars = ctx.shared.chorusBars().slice(0, sec.bars);
  return {
    ...ctx.band('breakdown', ctx.key, bars, RHYTHM.breakdown, rng),
    melody: ctx.shared.hook().take(bars.length),
  };
}
