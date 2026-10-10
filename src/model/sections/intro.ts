import type { Rng } from '../../lib/random';
import { INTRO, INTRO_TEXTURES } from '../../style';
import type { MaterialOf } from '../material';
import type { Melody } from '../melody';
import type { SectionOf } from '../section';
import type { WriteContext } from './context';

// The intro's chords in one of its textures, with the hook as a teaser,
// or perhaps a riff of its own.
export function intro(_sec: SectionOf<'intro'>, ctx: WriteContext, rng: Rng): MaterialOf<'intro'> {
  const { harmony, bars } = ctx.shared.intro();
  const variant = rng.weightedKey(INTRO_TEXTURES);
  let melody: Melody | undefined;
  if (harmony === 'chorus') melody = ctx.shared.hook().take(4);
  else if (harmony === 'template' && rng.chance(INTRO.melodyChance)) melody = ctx.melody('riff', ctx.key, bars, rng);
  return {
    ...ctx.band('intro', ctx.key, bars, INTRO_TEXTURES[variant].groove, rng),
    harmony,
    variant,
    ...(melody ? { melody } : {}),
  };
}
