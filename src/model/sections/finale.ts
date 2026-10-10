import type { Rng } from '../../lib/random';
import { FINALE_STYLES } from '../../style';
import { Chord } from '../../theory';
import type { MaterialOf } from '../material';
import type { SectionOf } from '../section';
import type { WriteContext } from './context';

// The key's final chord, and how it rings out.
export function finale(_sec: SectionOf<'finale'>, ctx: WriteContext, rng: Rng): MaterialOf<'finale'> {
  const { key } = ctx;
  const [symbol, scale] = rng.pick(ctx.tonality.finale);
  return { type: 'finale', key, chord: new Chord(key.tonic, symbol, scale), variant: rng.weightedKey(FINALE_STYLES) };
}
