import type { Rng } from '../../lib/random';
import { FORM, OUTRO_STYLES } from '../../style';
import type { MaterialOf } from '../material';
import { SoloWriter } from '../melody';
import type { SectionOf } from '../section';
import type { WriteContext } from './context';

export function outro(sec: SectionOf<'outro'>, ctx: WriteContext, rng: Rng): MaterialOf<'outro'> {
  const { groove } = OUTRO_STYLES[sec.variant];
  if (sec.variant === 'reprise') {
    // The intro's chords, and its teaser if it had one.
    const { bars, melody } = ctx.material(ctx.form.first('intro')!);
    return {
      ...ctx.band('outro', ctx.key, bars, groove, rng.fork('groove')),
      variant: 'reprise',
      ...(melody ? { melody } : {}),
    };
  }
  // Two soloists trade lines over the vamp's changes, or a vamp of its
  // own when the song has none: the song's soloists first, if it had solos.
  const loop = ctx.form.first('vamp') ? ctx.shared.vampBars() : ctx.loop('vamp', rng.fork('vamp'));
  const bars = Array.from({ length: sec.bars }, (_, i) => loop[i % loop.length]);
  const [first, second] = [...new Set([...ctx.form.soloists, ...FORM.soloists])];
  return {
    ...ctx.band('outro', ctx.key, bars, groove, rng.fork('groove')),
    variant: 'trade',
    solo: new SoloWriter(rng.fork('line')).write(bars),
    soloists: [first, second],
  };
}
