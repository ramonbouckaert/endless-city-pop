import type { Rng } from '../../lib/random';
import { DRUM_BREAK } from '../../style';
import { writeDrums } from '../groove';
import type { MaterialOf } from '../material';
import type { SectionOf } from '../section';
import type { WriteContext } from './context';

// Drums alone, then a pickup into the next section's first chord.
export function drumBreak(sec: SectionOf<'drumBreak'>, ctx: WriteContext, rng: Rng): MaterialOf<'drumBreak'> {
  const next = ctx.next(sec);
  const into = next && ctx.material(next);
  if (!into || !('bars' in into)) throw new Error(`A drum break can't pick up into ${next?.type ?? 'nothing'}`);
  return {
    type: 'drumBreak',
    key: ctx.key,
    drums: writeDrums(DRUM_BREAK, rng.fork('drums')),
    pickup: { into: into.bars[0][0], key: into.key, shift: next.shift },
  };
}
