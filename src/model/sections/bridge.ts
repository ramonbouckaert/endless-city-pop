import type { Rng } from '../../lib/random';
import { ADVENTUROUS, RHYTHM, tonalityOf } from '../../style';
import { Harmonizer } from '../harmony';
import type { MaterialOf } from '../material';
import type { SectionOf } from '../section';
import type { WriteContext } from './context';

// A related key's progression, then the cadence home (into the key of
// whatever follows).
export function bridge(sec: SectionOf<'bridge'>, ctx: WriteContext, rng: Rng): MaterialOf<'bridge'> {
  const key = new Harmonizer(ctx.key, rng.fork('key')).bridgeKey(ADVENTUROUS);
  const templates = tonalityOf(key.mode).templatesFor('bridge');
  const body = ctx.progress(rng.pick(templates), 6, rng.fork('harmony'), key);
  const cadence = new Harmonizer(ctx.key.transpose(ctx.form.after(sec)?.shift ?? 0), rng.fork('cadence')).approach();
  const bars = [...body, ...cadence];
  return {
    ...ctx.band('bridge', key, bars, RHYTHM.bridge, rng.fork('groove')),
    melody: ctx.melody('bridge', key, bars, rng.fork('melody')),
  };
}
