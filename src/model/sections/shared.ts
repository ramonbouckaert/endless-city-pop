// Chords and lines several parts play, each written once on first use:
// the chorus's and its hook (in the intro and breakdown too), the vamp's
// (a trading outro's too) and the intro's (a reprise's too).

import type { Rng } from '../../lib/random';
import { lazy } from '../../lib/lazy';
import { INTRO, type IntroHarmony } from '../../style';
import { Template, type Bar } from '../../theory';
import { Harmonizer } from '../harmony';
import type { WriteContext } from './context';

export class SharedHarmony {
  constructor(
    private readonly ctx: WriteContext,
    private readonly rng: Rng,
  ) {}

  /** The chorus's chords: eight bars, and a tag if the chorus runs longer. */
  readonly chorusBars = lazy((): Bar[] => {
    const { ctx } = this;
    const rng = this.rng.fork('chorusHarmony');
    const bars = ctx.progress(rng.pick(ctx.tonality.templatesFor('chorus')), 8, rng.fork('harmony'));
    const len = ctx.form.first('chorus')?.bars ?? 8;
    if (len <= 8) return bars;
    const tag = new Template(rng.pick(ctx.tonality.templatesFor('tag'))).fit(len - 8);
    return [...bars, ...new Harmonizer(ctx.key, rng.fork('tag')).realize(tag)];
  });

  /** The chorus's melody. */
  readonly hook = lazy(() => this.ctx.melody('chorus', this.ctx.key, this.chorusBars(), this.rng.fork('hook')));

  /** The vamp's chords. */
  readonly vampBars = lazy(() => this.ctx.loop('vamp', this.rng.fork('vampHarmony')));

  /** The intro's chords: the chorus's, planing chords, or a template of its own. */
  readonly intro = lazy((): { harmony: IntroHarmony; bars: Bar[] } => {
    const { ctx } = this;
    const rng = this.rng.fork('introHarmony');
    const harmony = rng.weighted(INTRO.harmony);
    if (harmony === 'chorus') return { harmony, bars: this.chorusBars().slice(0, 4) };
    if (harmony === 'planing') return { harmony, bars: new Harmonizer(ctx.key, rng.fork('planing')).planing() };
    return { harmony, bars: ctx.progress(rng.pick(ctx.tonality.templatesFor('intro')), 4, rng.fork('harmony')) };
  });
}
