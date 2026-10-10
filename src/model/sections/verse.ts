import type { Rng } from '../../lib/random';
import { RHYTHM } from '../../style';
import type { MaterialOf } from '../material';
import type { SectionOf } from '../section';
import type { WriteContext } from './context';

export function verse(_sec: SectionOf<'verse'>, ctx: WriteContext, rng: Rng): MaterialOf<'verse'> {
  const bars = ctx.progress(rng.pick(ctx.templates.verse), 8, rng.fork('harmony'));
  return {
    ...ctx.band('verse', ctx.key, bars, RHYTHM.verse, rng.fork('groove')),
    melody: ctx.melody('verse', ctx.key, bars, rng.fork('melody')),
  };
}
