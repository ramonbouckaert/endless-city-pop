import { renderDrums } from '../drums';
import { FIGURES } from '../figures';
import { bassScale } from '../notation';
import type { Parts, SectionContext } from './context';

// Drums alone, then a bass pickup into what follows.
export function drumBreak(ctx: SectionContext<'drumBreak'>): Parts {
  const { band, mat, len, repeat } = ctx;
  const { into, key, shift } = mat.pickup;
  const pickup = band.bass(FIGURES.pickup, bassScale(into, key));
  return { drums: renderDrums(band, mat.drums, len, repeat), pitched: [shift ? pickup.transpose(shift) : pickup] };
}
