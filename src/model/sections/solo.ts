import type { Rng } from '../../lib/random';
import { SOLO_COMPS } from '../../style';
import { Harmonizer } from '../harmony';
import type { MaterialOf } from '../material';
import { Solo } from '../melody';
import type { SectionOf } from '../section';
import type { WriteContext } from './context';

// Changes as long as the section, and the line over them: the first
// solo over the band, a later one never over what the one before had.
export function solo(sec: SectionOf<'solo'>, ctx: WriteContext, rng: Rng): MaterialOf<'solo'> {
  const before = ctx.previous(sec);
  const variant = before ? rng.weightedKey(SOLO_COMPS, ctx.material(before).variant) : 'band';
  const bars = new Harmonizer(ctx.key, rng.fork('changes')).solo(sec.bars);
  return {
    ...ctx.band('solo', ctx.key, bars, SOLO_COMPS[variant].groove, rng),
    variant,
    solo: Solo.improvise(bars, rng.fork('line')),
  };
}
