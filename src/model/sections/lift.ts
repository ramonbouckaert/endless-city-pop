import type { Rng } from '../../lib/random';
import { LIFT_STYLES, RHYTHM } from '../../style';
import { Harmonizer } from '../harmony';
import type { MaterialOf } from '../material';
import type { SectionOf } from '../section';
import type { WriteContext } from './context';

// A turnaround into the lifted key, never played the way the lift before it was.
export function lift(sec: SectionOf<'lift'>, ctx: WriteContext, rng: Rng): MaterialOf<'lift'> {
  const { turnaround } = sec;
  const key = ctx.key.transpose(sec.liftTo);
  const bars = new Harmonizer(key, rng.fork('harmony')).turnaround(turnaround);
  const before = ctx.previous(sec);
  const variant = rng.weightedKey(LIFT_STYLES, before && ctx.material(before).variant);
  return { ...ctx.band('lift', key, bars, RHYTHM.lift, rng), turnaround, variant };
}
