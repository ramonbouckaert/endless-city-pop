import type { Rng } from '../../lib/random';
import { PRE_FLAVOURS } from '../../style';
import { Harmonizer } from '../harmony';
import type { MaterialOf } from '../material';
import type { SectionOf } from '../section';
import type { WriteContext } from './context';

// One of the flavour's progressions, fitted to end on its cadence into
// the chorus (one as long as the section, if there is one).
export function pre(sec: SectionOf<'pre'>, ctx: WriteContext, rng: Rng): MaterialOf<'pre'> {
  const { key } = ctx;
  const variant = rng.weightedKey(PRE_FLAVOURS);
  const { groove, melody } = PRE_FLAVOURS[variant];
  const template = rng.pick(ctx.tonality.preTemplates(variant, sec.bars));
  const bars = new Harmonizer(key, rng.fork('harmony')).progression(template, sec.bars, { ending: true });
  return {
    ...ctx.band('pre', key, bars, groove, rng.fork('groove')),
    variant,
    melody: ctx.melody('pre', key, bars, rng.fork('melody'), melody),
  };
}
