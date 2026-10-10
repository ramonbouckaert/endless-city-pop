import type { Rng } from '../../lib/random';
import { ADVENTUROUS, RHYTHM, TONALITIES } from '../../style';
import { Harmonizer } from '../harmony';
import type { MaterialOf } from '../material';
import type { SectionOf } from '../section';
import type { WriteContext } from './context';

// A related key's progression, then the cadence home (into the key of
// whatever follows).
export function bridge(sec: SectionOf<'bridge'>, ctx: WriteContext, rng: Rng): MaterialOf<'bridge'> {
  const key = new Harmonizer(ctx.key, rng).bridgeKey(ADVENTUROUS);
  const templates = TONALITIES[key.mode].templates.bridge;
  if (!templates) throw new Error(`No bridge templates in ${key.mode}`);
  const body = ctx.progress(rng.pick(templates), 6, rng, key);
  const cadence = new Harmonizer(ctx.key.transpose(ctx.after(sec)?.shift ?? 0), rng).approach();
  const bars = [...body, ...cadence];
  return { ...ctx.band('bridge', key, bars, RHYTHM.bridge, rng), melody: ctx.melody('bridge', key, bars, rng) };
}
