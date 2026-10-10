import type { Rng } from '../../lib/random';
import { RHYTHM, VAMP_ENTRIES } from '../../style';
import type { MaterialOf } from '../material';
import type { SectionOf } from '../section';
import type { WriteContext } from './context';

// The vamp's chords, and how its drums come in.
export function vamp(_sec: SectionOf<'vamp'>, ctx: WriteContext, rng: Rng): MaterialOf<'vamp'> {
  return {
    ...ctx.band('vamp', ctx.key, ctx.shared.vampBars(), RHYTHM.vamp, rng),
    variant: rng.weightedKey(VAMP_ENTRIES),
  };
}
