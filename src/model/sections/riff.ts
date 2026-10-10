import type { Rng } from '../../lib/random';
import { RHYTHM } from '../../style';
import type { MaterialOf } from '../material';
import type { SectionOf } from '../section';
import type { WriteContext } from './context';

export function riff(_sec: SectionOf<'riff'>, ctx: WriteContext, rng: Rng): MaterialOf<'riff'> {
  const bars = ctx.loop('riff', rng.fork('loop'));
  return {
    ...ctx.band('riff', ctx.key, bars, RHYTHM.riff, rng.fork('groove')),
    melody: ctx.melody('riff', ctx.key, bars, rng.fork('melody')),
  };
}
