import type { MaterialOf } from '../../model';
import { FIGURES } from '../figures';
import { bassScale } from '../notation';
import type { Parts, SectionContext } from './context';

// Drums alone, then a bass pickup into what follows.
export function drumBreak(ctx: SectionContext<MaterialOf<'drumBreak'>>): Parts {
  const { into, key, shift } = ctx.mat.pickup;
  const pickup = ctx.band.bass(FIGURES.pickup, bassScale(into, key));
  return { drums: ctx.drums(), pitched: [shift ? pickup.transpose(shift) : pickup] };
}
